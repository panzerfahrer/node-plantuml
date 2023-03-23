'use strict'

const { URL } = require('url')
const fs = require('fs')

const trace = []
module.exports = function download (uri, filename, changeExitCodeOnError, callback) {
  trace.push('GET ' + uri)
  const protocol = new URL(uri).protocol.slice(0, -1)

  require(protocol).get(uri, function (res) {
    trace.push('Response: ' + res.statusCode)
    if (res.statusCode === 200) {
      // Success, pipe to file
      process.stdout.write('... Downloading')
      let downloaded = 0
      let lastProgress = 0
      const totalSize = res.headers['content-length']
      res.on('data', function (chunk) {
        downloaded += chunk.length
        const progress = Math.round((downloaded / totalSize) * 100)
        if (progress % 25 === 0 && progress > lastProgress) {
          lastProgress = progress
          process.stdout.write(`...${progress}%`)
        }
      })
      const fileStream = fs.createWriteStream(filename)
      res.on('end', () => {
        console.info('... Done')
        fileStream.close()
        if (callback) {
          callback()
        }
      })
      res.pipe(fileStream)
    } else if (res.headers.location) {
      // Follow redirect
      console.info('... Redirecting to ' + res.headers.location)
      download(res.headers.location, filename, changeExitCodeOnError, callback)
    } else {
      // Error
      trace.forEach(function (line) {
        console.error(line)
      })
      const error = 'Failed to download ' + filename
      console.error(error)

      if (changeExitCodeOnError) {
        process.exitCode = 1
      }

      if (callback) {
        callback(error)
      }
    }
  })
}
