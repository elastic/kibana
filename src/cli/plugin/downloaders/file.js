const Promise = require('bluebird');
const fs = require('fs');
const _ = require('lodash');
const getProgressReporter = require('../progressReporter');

/*
Responsible for managing local file transfers
*/
module.exports = function (logger, sourcePath, targetPath) {
  let _resolve;
  let _reject;
  let _archiveType;
  let _hasError = false;
  let _readStream;
  let _writeStream;
  let _errorMessage;
  let _progressReporter = getProgressReporter(logger);

  const promise = new Promise(function (resolve, reject) {
    _resolve = resolve;
    _reject = reject;
  });

  function consumeStreams() {
    //console.log('file.consumeStreams');
    _readStream
      .on('data', handleData)
      .on('error', _.partial(handleError, 'ENOTFOUND'))
      .pipe(_writeStream, { end: true })
      .on('finish', handleEnd);

    return promise;
  }

  function createReadStream() {
    let fileSize;
    //console.log('file.createReadStream');
    return Promise.try(() => {
      _archiveType = getArchiveTypeFromFilename(sourcePath);

      let fileInfo = fs.statSync(sourcePath);
      fileSize = fileInfo.size;

      return fs.createReadStream(sourcePath);
    })
    .catch((err) => {
      if (err.message.match(/ENOENT/i)) {
        throw new Error('ENOTFOUND');
      }
      throw err;
    })
    .then((readStream) => {
      _readStream = readStream;
      _progressReporter.init(fileSize);
    });
  }

  function createWriteStream(readStream) {
    //console.log('file.createWriteStream');
    _writeStream = fs.createWriteStream(targetPath);
    // _writeStream.on('finish', function () {
    //   if (!_hasError) return;
    //   fs.unlinkSync(targetPath);
    //   _reject(new Error(_errorMessage));
    // });

    return;
  }

  function handleError(errorMessage, err) {
    //console.log('file.handleError', errorMessage);
    if (_hasError) return;

    if (err) logger.error(err);
    _hasError = true;
    _errorMessage = errorMessage;

    if (_readStream.abort) _readStream.abort();
  }

  function handleData(buffer) {
    //console.log('file.handleData');
    if (_hasError) return;
    _progressReporter.progress(buffer.length);
  }

  function handleEnd() {
    //console.log('file.handleEnd', _hasError);
    if (_hasError) return;

    logger.log('Transfer complete');
    _resolve({
      archiveType: _archiveType
    });
  }

  function getArchiveTypeFromFilename() {
    //console.log('file.getArchiveTypeFromFilename', sourcePath);
    if (/\.zip$/i.test(sourcePath)) {
      return '.zip';
    }
    if (/\.tar\.gz$/i.test(sourcePath)) {
      return '.tar.gz';
    }
  }

  return createReadStream()
 .then(createWriteStream)
 .then(consumeStreams);
};











// const Promise = require('bluebird');
// const fs = require('fs');
// const _ = require('lodash');

// /*
// Responsible for managing local file transfers
// */
// module.exports = function (logger, readStream, targetPath) {
//   let oldDotCount = 0;
//   let runningTotal = 0;
//   let totalSize = 0;
//   let hasError = false;
//   let archiveType = undefined;
//   let _resolve;
//   let _reject;
//   let _resp;


//   let _errorMessage;
//   ////console.log('targetPath:', targetPath);
//   let _writeStream = fs.createWriteStream(targetPath);
//   _writeStream.on('finish', function () {
//     ////console.log('writestream finish');
//     if (!hasError) return;
//     fs.unlinkSync(targetPath);
//     _reject(new Error(_errorMessage));
//   });

//   readStream
//     .on('response', handleResponse)
//     .on('data', handleData)
//     .on('error', _.partial(handleError, 'ENOTFOUND'))
//     .pipe(_writeStream, { end: true })
//     .on('finish', handleEnd);

//   const promise = new Promise(function (resolve, reject) {
//     _resolve = resolve;
//     _reject = reject;
//   });

//   function handleError(errorMessage, err) {
//     ////console.log('handleError', errorMessage, err);
//     if (hasError) return;

//     if (err) logger.error(err);
//     hasError = true;
//     _errorMessage = errorMessage;

//     ////console.log('!!readStream.abort', (!!readStream.abort));
//     if (readStream.abort) readStream.abort();
//   }

//   function handleResponse(resp) {
//     _resp = resp;
//     ////console.log('handleResponse resp.statusCode: ', resp.statusCode);
//     if (resp.statusCode >= 400) {
//       handleError('ENOTFOUND', null);
//     } else {
//       archiveType = getArchiveTypeFromResponse(resp.headers['content-type']);

//       totalSize = parseInt(resp.headers['content-length'], 10) || 0;
//       let totalDesc = totalSize || 'unknown number of';

//       logger.log('Transferring ' + totalDesc + ' bytes', true);
//     }
//   }

//   //Should log a dot for every 5% of progress
//   //Note: no progress is logged if the plugin is downloaded in a single packet
//   function handleData(buffer) {
//     ////console.log('handleData');
//     if (hasError) return;
//     if (!totalSize) return;

//     runningTotal += buffer.length;
//     let dotCount = Math.round(runningTotal / totalSize * 100 / 5);
//     if (dotCount > 20) dotCount = 20;
//     for (let i = 0; i < (dotCount - oldDotCount); i++) {
//       logger.log('.', true);
//     }
//     oldDotCount = dotCount;
//   }

//   function handleEnd() {
//     if (hasError) return;

//     logger.log('Transfer complete');
//     _resolve({
//       archiveType: archiveType
//     });
//   }

//   function getArchiveTypeFromResponse(contentType) {
//     contentType = contentType || '';

//     switch (contentType.toLowerCase()) {
//       case 'application/zip':
//         return '.zip';
//         break;
//       case 'application/x-gzip':
//         return '.tar.gz';
//         break;
//     }
//   }

//   return {
//     promise: promise,
//     writeStream: _writeStream,
//     handleResponse: handleResponse,
//     handleError: handleError,
//     handleData: handleData,
//     handleEnd: handleEnd,
//     hasError: function () { return hasError; }
//   };
// };
