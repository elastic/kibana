var logger = require('./logger');
var _ = require('lodash');
module.exports = function (options) {
  return function (req, res, next) {
    var startTime = new Date();
    var end = res.end;
    var _req = _.pick(req, ['url', 'headers', 'method']);
    _req.connection = _.pick(req.connection, ['remoteAddress', 'remotePort']);
    res.end = function (chunk, encoding) {
      var contentLength = 0;
      if (res._header && res._header['content-length']) {
        contentLength = parseInt(res._header['content-length'], 10);
      }
      res.responseTime = (new Date()).getTime() - startTime.getTime();
      res.contentLength = isNaN(contentLength) ? 0 : contentLength;
      end.call(res, chunk, encoding);
      logger.info({ req: _req, res: res }, '%s %s %d - %dms', req.method, req.url, res.statusCode, res.responseTime);
    };
    next();
  };
};
