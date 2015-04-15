var logger = require('./logger');
var _ = require('lodash');
module.exports = function (options) {
  return function (req, res, next) {
    var startTime = new Date();
    var end = res.end;
    var _req = _.pick(req, ['url', 'headers', 'method']);
    _req.connection = _.pick(req.connection, ['remoteAddress', 'remotePort']);
    res.end = function (chunk, encoding) {
      res.contentLength = parseInt(res.getHeader('content-length') || 0, 10);
      res.responseTime = (new Date()).getTime() - startTime.getTime();
      end.call(res, chunk, encoding);
      logger.info({ req: _req, res: res }, '%s %s %d - %dms', req.method, req.url, res.statusCode, res.responseTime);
    };
    next();
  };
};
