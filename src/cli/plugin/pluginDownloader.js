let _ = require('lodash');
let Promise = require('bluebird');
let urlParse = require('url').parse;
let fs = require('fs');
let request = require('request');
let progressReporter = require('./progressReporter');

module.exports = function (settings, logger) {
  let archiveType = undefined;

  //Attempts to download each url in turn until one is successful
  function download() {
    let urls = settings.urls;

    function tryNext() {
      let sourceUrl = urls.shift();
      if (!sourceUrl) {
        throw new Error('No valid url specified.');
      }

      logger.log(`Attempting to transfer from ${sourceUrl}`);

      return Promise.try(() => {
        return downloadSingle(sourceUrl, settings.workingPath, settings.timeout, logger)
        .catch((err) => {
          if (err.message === 'ENOTFOUND') {
            return tryNext();
          }
          throw (err);
        });
      })
      .catch((err) => {
        //Special case for when request.get throws an exception
        if (err.message.match(/invalid uri/i)) {
          return tryNext();
        }
        throw (err);
      });
    }

    return tryNext();
  }

  function downloadSingle(source, dest, timeout) {
    let requestOptions = { url: source };
    if (timeout !== 0) {
      requestOptions.timeout = timeout;
    }

    return getReadStream(requestOptions)
    .then((readStream) => {
      let writeStream = fs.createWriteStream(settings.tempArchiveFile);
      let reporter = progressReporter(logger, readStream);

      readStream
      .on('response', reporter.handleResponse)
      .on('data', reporter.handleData)
      .on('error', _.partial(reporter.handleError, 'ENOTFOUND'))
      .pipe(writeStream)
      .on('finish', reporter.handleEnd);

      return reporter.promise;
    })
    .then((downloadResult) => {
      archiveType = archiveType || downloadResult.archiveType;
      return archiveType;
    });
  }

  function getReadStream(requestOptions) {
    let urlInfo = urlParse(requestOptions.url);

    if (/^file/.test(urlInfo.protocol)) {
      return getReadStreamFromFile(urlInfo.path);
    } else {
      return getReadStreamFromUrl(requestOptions);
    }
  }

  function getReadStreamFromFile(filePath) {
    return Promise.try(() => {
      archiveType = getArchiveTypeFromFilename(filePath);
      return fs.createReadStream(filePath);
    });
  }

  function getReadStreamFromUrl(requestOptions) {
    return Promise.try(() => {
      return request.get(requestOptions);
    })
    .catch((err) => {
      if (err.message.match(/invalid uri/i)) {
        throw new Error('ENOTFOUND');
      }
      throw err;
    });
  }

  function getArchiveTypeFromFilename(filePath) {
    if (/.zip$/.test(filePath)) {
      return '.zip';
    }
    if (/.tar.gz$/.test(filePath)) {
      return '.tar.gz';
    }
  }

  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
