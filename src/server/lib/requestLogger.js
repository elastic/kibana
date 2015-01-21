var logger = require('./logger');
module.exports = function (options) {
  return function (req, res, next) {
    var startTime = new Date();
    var end = res.end;
    res.end = function (chunk, encoding) {
      var contentLength = parseInt(res._header['content-length'], 10);
      res.responseTime = (new Date()).getTime() - startTime.getTime();
      res.contentLength = isNaN(contentLength) ? 0 : contentLength;
      end.call(res, chunk, encoding);
      logger.info({ req: req, res: res }, '%s %s %d - %dms', req.method, req.url, res.statusCode, res.responseTime);
    };
    next();
  };
};
