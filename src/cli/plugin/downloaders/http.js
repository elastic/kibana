const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const request = require('request');
const getProgressReporter = require('../progressReporter');

/*
Responsible for managing http transfers
*/
module.exports = function (logger, sourceUrl, targetPath, timeout) {
  let _archiveType;
  let _readStream;
  let _error;
  let _progressReporter = getProgressReporter(logger);

  return new Promise(function (resolve, reject) {
    let requestOptions = { url: sourceUrl };
    if (timeout !== 0) {
      requestOptions.timeout = timeout;
    }

    try {
      request.get(requestOptions)
      .on('response', handleResponse)
      .on('data', handleData)
      .on('error', _.partial(handleError, false, 'ENOTFOUND'));
    } catch (err) {
      if (err.message.match(/invalid uri/i)) {
        handleError(true, 'ENOTFOUND');
        return;
      }
      handleError(true, null, err);
    }

    function handleResponse(resp) {
      _readStream = resp;

      if (resp.statusCode >= 400) {
        handleError(true, 'ENOTFOUND');
      } else {
        _archiveType = getArchiveTypeFromResponse(resp.headers['content-type']);
        let totalSize = parseInt(resp.headers['content-length'], 10) || 0;

        //Note: no progress is logged if the plugin is downloaded in a single packet
        _progressReporter.init(totalSize);

        let writeStream = fs.createWriteStream(targetPath)
        .on('error', _.partial(handleError, false, null))
        .on('finish', handleFinish);

        _readStream.pipe(writeStream);
      }
    }

    function handleError(finish, errorMessage, err) {
      if (_error) return;

      _error = err;
      if (errorMessage) _error = new Error(errorMessage);

      if (err) logger.error(err);
      if (_readStream && _readStream.abort) _readStream.abort();
      if (finish) handleFinish();
    }

    function handleFinish() {
      if (_error) {
        reject(_error);
      } else {
        logger.log('Transfer complete');
        resolve({
          archiveType: _archiveType
        });
      }
    }

    function handleData(buffer) {
      if (_error) return;
      _progressReporter.progress(buffer.length);
    }

    function getArchiveTypeFromResponse(contentType) {
      contentType = contentType || '';

      switch (contentType.toLowerCase()) {
        case 'application/zip':
          return '.zip';
          break;
        case 'application/x-gzip':
          return '.tar.gz';
          break;
      }
    }
  });
};
