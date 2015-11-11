const _ = require('lodash');
const Promise = require('bluebird');
const urlParse = require('url').parse;
const fs = require('fs');
const request = require('request');
const progressReporter = require('./progressReporter');

module.exports = function (settings, logger) {
  let archiveType;

  //Attempts to download each url in turn until one is successful
  function download() {
    const urls = settings.urls;

    function tryNext() {
      const sourceUrl = urls.shift();
      if (!sourceUrl) {
        throw new Error('No valid url specified.');
      }

      logger.log(`Attempting to transfer from ${sourceUrl}`);

      return Promise.try(() => {
        return downloadSingle(sourceUrl)
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

  function downloadSingle(source) {
    return getReadStream(source)
    .then((readStream) => {
      console.log('downloadSingle after getReadStream');
      let reporter = progressReporter(logger, readStream, settings.tempArchiveFile);

      readStream
      .on('response', reporter.handleResponse)
      .on('data', reporter.handleData)
      .on('error', _.partial(reporter.handleError, 'ENOTFOUND'))
      .pipe(reporter.writeStream, { end: true })
      .on('finish', reporter.handleEnd);

      return reporter.promise;
    })
    .then((downloadResult) => {
      //If installing from a local file, the archiveType will be determined by the
      //file extension in getReadStreamFromFile. Otherwise it is determined
      //by the progressReporter by examining the response header.
      archiveType = archiveType || downloadResult.archiveType;
      return archiveType;
    });
  }

  function getReadStream(sourceUrl) {
    const urlInfo = urlParse(sourceUrl);

    if (/^file/.test(urlInfo.protocol)) {
      return getReadStreamFromFile(urlInfo.path);
    } else {
      return getReadStreamFromUrl(sourceUrl);
    }
  }

  function getReadStreamFromFile(filePath) {
    console.log('getReadStreamFromFile: ', filePath);
    return Promise.try(() => {
      archiveType = getArchiveTypeFromFilename(filePath);
      return fs.createReadStream(filePath);
    });
  }

  function getReadStreamFromUrl(sourceUrl) {
    let requestOptions = { url: sourceUrl };
    if (settings.timeout !== 0) {
      requestOptions.timeout = settings.timeout;
    }

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
    if (/\.zip$/i.test(filePath)) {
      return '.zip';
    }
    if (/\.tar\.gz$/i.test(filePath)) {
      return '.tar.gz';
    }
  }

  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
