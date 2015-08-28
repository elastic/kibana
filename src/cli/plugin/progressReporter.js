var Promise = require('bluebird');

/*
Responsible for reporting the progress of the file stream
*/
module.exports = function (logger, stream) {
  var oldDotCount = 0;
  var runningTotal = 0;
  var totalSize = 0;
  var hasError = false;
  var _resolve;
  var _reject;
  var _resp;

  var promise = new Promise(function (resolve, reject) {
    _resolve = resolve;
    _reject = reject;
  });

  function handleError(errorMessage, err) {
    if (hasError) return;

    if (err) logger.error(err);
    hasError = true;
    if (stream.abort) stream.abort();
    _reject(new Error(errorMessage));
  }

  function handleResponse(resp) {
    _resp = resp;
    if (resp.statusCode >= 400) {
      handleError('ENOTFOUND', null);
    } else {
      totalSize = parseInt(resp.headers['content-length'], 10) || 0;
      var totalDesc = totalSize || 'unknown number of';

      logger.log('Downloading ' + totalDesc + ' bytes', true);
    }
  }

  //Should log a dot for every 5% of progress
  //Note: no progress is logged if the plugin is downloaded in a single packet
  function handleData(buffer) {
    if (hasError) return;
    if (!totalSize) return;

    runningTotal += buffer.length;
    var dotCount = Math.round(runningTotal / totalSize * 100 / 5);
    if (dotCount > 20) dotCount = 20;
    for (var i = 0; i < (dotCount - oldDotCount); i++) {
      logger.log('.', true);
    }
    oldDotCount = dotCount;
  }

  function handleEnd() {
    if (hasError) return;

    logger.log('Extraction complete');
    _resolve();
  }

  return {
    promise: promise,
    handleResponse: handleResponse,
    handleError: handleError,
    handleData: handleData,
    handleEnd: handleEnd,
    hasError: function () { return hasError; }
  };
};
