const _ = require('lodash');
const Promise = require('bluebird');
const urlParse = require('url').parse;
const fs = require('fs');
const request = require('request');
const progressReporter = require('./progressReporter');
const downloadHttpFile = require('./downloaders/http');
const downloadLocalFile = require('./downloaders/file');

module.exports = function (settings, logger) {
  let archiveType;
  let sourceType;

  //Attempts to download each url in turn until one is successful
  function download() {
    const urls = settings.urls;

    function tryNext() {
      const sourceUrl = urls.shift();
      //console.log('tryNext', sourceUrl);
      if (!sourceUrl) {
        throw new Error('No valid url specified.');
      }

      logger.log(`Attempting to transfer from ${sourceUrl}`);

      return downloadSingle(sourceUrl)
      .catch((err) => {
        //console.log('download error handler', err);
        if (err.message === 'ENOTFOUND') {
          return tryNext();
        }
        throw (err);
      });
    }

    return tryNext();
  }

  function downloadSingle(sourceUrl) {
    //console.log('downloadSingle', sourceUrl);
    const urlInfo = urlParse(sourceUrl);
    let downloadPromise;

    if (/^file/.test(urlInfo.protocol)) {
      //console.log('calling downloadLocalFile');
      downloadPromise = downloadLocalFile(logger, urlInfo.path, settings.tempArchiveFile);
    } else {
      //console.log('calling downloadHttpFile');
      downloadPromise = downloadHttpFile(logger, sourceUrl, settings.tempArchiveFile, settings.timeout);
    }

    return downloadPromise;
  }

  return {
    download: download,
    _downloadSingle: downloadSingle
  };
};
