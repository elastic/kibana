var _ = require('lodash');
var zlib = require('zlib');
var Promise = require('bluebird');
var url = require('url');
var fs = require('fs');
var request = require('request');
var tar = require('tar');
var DecompressZip = require('decompress-zip');
var path = require('path');
var progressReporter = require('./progressReporter');

module.exports = function (settings, logger) {

  //Attempts to download each url in turn until one is successful
  function download() {
    var urls = settings.urls;

    function tryNext() {
      var sourceUrl = urls.shift();
      if (!sourceUrl) {
        throw new Error('Not a valid url.');
      }

      logger.log('Attempting to extract from ' + sourceUrl);

      return Promise.try(function () {
        return downloadSingle(sourceUrl, settings.workingPath, settings.timeout, logger)
        .catch(function (err) {
          if (err.message === 'ENOTFOUND') {
            return tryNext();
          }
          if (err.message === 'EEXTRACT') {
            throw (new Error('Error extracting the plugin archive... is this a valid tar.gz file?'));
          }
          throw (err);
        });
      })
      .catch(function (err) {
        //Special case for when request.get throws an exception
        if (err.message.match(/invalid uri/i)) {
          return tryNext();
        }
        throw (err);
      });
    }

    return tryNext();
  }

  //Determines the file protocol from the url extension
  //TODO: This will not work. :( Could have a url without a file extension
  function downloadSingle(source, dest, timeout) {
    let urlInfo = url.parse(source);

    if (/\.tar\.gz$/.test(urlInfo.pathname)) {
      return downloadTarGz(source, dest, timeout);
    } else if (/\.zip$/.test(urlInfo.pathname)) {
      return downloadZip(source, dest, timeout);
    } else {
      throw new Error('Unexpected file extension.');
    }
  }

  function downloadZip(source, dest, timeout) {
    var tempFile = path.join(dest, 'temp.zip');
    var writeStream = fs.createWriteStream(tempFile);

    var requestOptions = { url: source };
    if (timeout !== 0) {
      requestOptions.timeout = timeout;
    }

    return wrappedRequest(requestOptions)
    .then(function (fileStream) {
      var reporter = progressReporter(logger, fileStream);

      fileStream
      .on('response', reporter.handleResponse)
      .on('data', reporter.handleData)
      .on('error', _.partial(reporter.handleError, 'ENOTFOUND'))
      .on('end', reporter.handleEnd)
      .pipe(writeStream);

      return reporter.promise
      .then(function () {
        return new Promise(function (resolve, reject) {
          var unzipper = new DecompressZip(tempFile);

          unzipper.on('error', function (err) {
            console.log('Caught an error');
            return reject();
          });

          unzipper.on('extract', function (log) {
            console.log('Finished extracting');
            return resolve();
          });

          unzipper.on('progress', function (fileIndex, fileCount) {
            console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
          });

          unzipper.extract({
            path: dest,
            filter: function (file) {
              return file.type !== 'SymbolicLink';
            }
          });
        });
      });
    });
  }

  function downloadTarGz(source, dest, timeout) {
    var gunzip = zlib.createGunzip();
    var tarExtract = new tar.Extract({ path: dest, strip: 1 });

    var requestOptions = { url: source };
    if (timeout !== 0) {
      requestOptions.timeout = timeout;
    }

    return wrappedRequest(requestOptions)
    .then(function (fileStream) {
      var reporter = progressReporter(logger, fileStream);

      fileStream
      .on('response', reporter.handleResponse)
      .on('data', reporter.handleData)
      .on('error', _.partial(reporter.handleError, 'ENOTFOUND'))
      .pipe(gunzip)
      .on('error', _.partial(reporter.handleError, 'EEXTRACT'))
      .pipe(tarExtract)
      .on('error', _.partial(reporter.handleError, 'EEXTRACT'))
      .on('end', reporter.handleEnd);

      return reporter.promise;
    });
  }

  function wrappedRequest(requestOptions) {
    return Promise.try(function () {
      let urlInfo = url.parse(requestOptions.url);
      if (isFileProtocol(urlInfo.protocol)) {
        return fs.createReadStream(urlInfo.path);
      } else {
        return request.get(requestOptions);
      }
    })
    .catch(function (err) {
      if (err.message.match(/invalid uri/i)) {
        throw new Error('ENOTFOUND');
      }
      throw err;
    });
  }

  function isFileProtocol(url) {
    return /^file/.test(url);
  }


  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
