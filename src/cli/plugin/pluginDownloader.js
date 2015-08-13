var _ = require('lodash');
var zlib = require('zlib');
var Promise = require('bluebird');
var wreck = require('wreck');
var tar = require('tar');
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

      logger.log('attempting to download ' + sourceUrl);

      return Promise.try(function () {
        return downloadSingle(sourceUrl, settings.workingPath, settings.timeout, logger)
        .catch(function (err) {
          if (err.message === 'ENOTFOUND') {
            return tryNext();
          }
          if (err.message === 'EEXTRACT') {
            throw (new Error('Error extracting the plugin archive'));
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

  //Attempts to download a single url
  function downloadSingle(source, dest, timeout) {
    var gunzip = zlib.createGunzip();
    var tarExtract = new tar.Extract({ path: dest, strip: 1 });

    return wrappedRequest(source, timeout)
    .then(function (req) {
      var reporter = progressReporter(logger, req);

      req
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

  function wrappedRequest(url, timeout) {
    if (timeout) timeout = false;

    return Promise.fromNode(cb => {
      return wreck.defaults({ timeout }).request('GET', url, null, cb);
    })
    .catch(function (err) {
      if (err.message.match(/invalid uri/i)) {
        throw new Error('ENOTFOUND');
      }
      throw err;
    });
  }


  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
