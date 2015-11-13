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
  let _hasError = false;
  let _readStream;
  let _writeStream;
  let _errorMessage;
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
        .on('error', _.partial(handleError, 'ENOTFOUND'));
    } catch (err) {
      if (err.message.match(/invalid uri/i)) {
        handleError('ENOTFOUND', null);
        handleFinish();
        //reject(new Error('ENOTFOUND'));
        return;
      }
      handleError(null, err);
      handleFinish();
      //reject(err);
    }

    function handleResponse(resp) {
      _readStream = resp;

      if (resp.statusCode >= 400) {
        handleError('ENOTFOUND', null);
        handleFinish();
      } else {
        _writeStream = fs.createWriteStream(targetPath);
        _writeStream.on('error', _.partial(handleError, null));
        _writeStream.on('finish', handleFinish);

        _archiveType = getArchiveTypeFromResponse(resp.headers['content-type']);
        let totalSize = parseInt(resp.headers['content-length'], 10) || 0;

        //Note: no progress is logged if the plugin is downloaded in a single packet
        _progressReporter.init(totalSize);

        _readStream.pipe(_writeStream);
      }
    }

    function handleFinish() {
      if (_hasError) {
        reject(new Error(_errorMessage));
      } else {
        logger.log('Transfer complete');
        resolve({
          archiveType: _archiveType
        });
      }
    }

    function handleError(errorMessage, err) {
      if (_hasError) return;

      if (err) logger.error(err);
      _hasError = true;
      _errorMessage = errorMessage;

      if (_readStream.abort) _readStream.abort();
    }

    function handleData(buffer) {
      if (_hasError) return;
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
}
