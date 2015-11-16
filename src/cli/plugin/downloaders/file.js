const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const request = require('request');
const getProgressReporter = require('../progressReporter');

/*
Responsible for managing local file transfers
*/
module.exports = function (logger, sourcePath, targetPath) {
  let _archiveType;
  let _readStream;
  let _error;
  let _progressReporter = getProgressReporter(logger);

  return new Promise(function (resolve, reject) {
    try {
      let fileInfo = fs.statSync(sourcePath);
      fileSize = fileInfo.size;
      _progressReporter.init(fileSize);

      _archiveType = getArchiveTypeFromFilename(sourcePath);

      _readStream = fs.createReadStream(sourcePath)
      .on('data', handleData)
      .on('error', _.partial(handleError, 'ENOTFOUND'))
      .on('finish', handleEnd);

      let writeStream = fs.createWriteStream(targetPath)
      .on('error', _.partial(handleError, false, null))
      .on('finish', handleFinish);

      _readStream.pipe(writeStream);
    } catch (err) {
      if (err.message.match(/enoent/i)) {
        handleError(true, 'ENOTFOUND');
        return;
      }
      handleError(true, null, err);
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










