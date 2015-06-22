/*!
 * morgan
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var auth = require('basic-auth')
var deprecate = require('depd')('morgan')
var onFinished = require('on-finished')

/**
 * Default log buffer duration.
 */

var defaultBufferDuration = 1000;

/**
 * Create a logger middleware.
 *
 * @param {String|Function} format
 * @param {Object} [options]
 * @return {Function} middleware
 * @api public
 */

exports = module.exports = function morgan(format, options) {
  if (typeof format === 'object') {
    options = format
    format = options.format || 'default'

    // smart deprecation message
    deprecate('morgan(options): use morgan(' + (typeof format === 'string' ? JSON.stringify(format) : 'format') + ', options) instead')
  }

  if (format === undefined) {
    deprecate('undefined format: specify a format')
  }

  options = options || {}

  // output on request instead of response
  var immediate = options.immediate;

  // check if log entry should be skipped
  var skip = options.skip || function () { return false; };

  // format function
  var fmt = compile(exports[format] || format || exports.default)

  // options
  var stream = options.stream || process.stdout
    , buffer = options.buffer;

  // buffering support
  if (buffer) {
    var realStream = stream
    var buf = []
    var timer = null
    var interval = 'number' == typeof buffer
      ? buffer
      : defaultBufferDuration

    // flush function
    var flush = function(){
      timer = null

      if (buf.length) {
        realStream.write(buf.join(''));
        buf.length = 0;
      }
    }

    // swap the stream
    stream = {
      write: function(str){
        if (timer === null) {
          timer = setTimeout(flush, interval)
        }

        buf.push(str);
      }
    };
  }

  return function logger(req, res, next) {
    req._startAt = process.hrtime();
    req._startTime = new Date;
    req._remoteAddress = getip(req);

    function logRequest(){
      if (skip(req, res)) return;
      var line = fmt(exports, req, res);
      if (null == line) return;
      stream.write(line + '\n');
    };

    // immediate
    if (immediate) {
      logRequest();
    } else {
      onFinished(res, logRequest)
    }

    next();
  };
};

/**
 * Compile `format` into a function.
 *
 * @param {Function|String} format
 * @return {Function}
 * @api private
 */

function compile(format) {
  if (typeof format === 'function') {
    // already compiled
    return format
  }

  if (typeof format !== 'string') {
    throw new TypeError('argument format must be a function or string')
  }

  var fmt = format.replace(/"/g, '\\"')
  var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function(_, name, arg){
    return '"\n    + (tokens["' + name + '"](req, res, "' + arg + '") || "-") + "';
  }) + '";'

  return new Function('tokens, req, res', js);
};

/**
 * Define a token function with the given `name`,
 * and callback `fn(req, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Object} exports for chaining
 * @api public
 */

exports.token = function(name, fn) {
  exports[name] = fn;
  return this;
};

/**
 * Define a `fmt` with the given `name`.
 *
 * @param {String} name
 * @param {String|Function} fmt
 * @return {Object} exports for chaining
 * @api public
 */

exports.format = function(name, fmt){
  exports[name] = fmt;
  return this;
};

/**
 * Apache combined log format.
 */

exports.format('combined', ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

/**
 * Apache common log format.
 */

exports.format('common', ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length]')

/**
 * Default format.
 */

exports.format('default', ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"');
deprecate.property(exports, 'default', 'default format: use combined format')

/**
 * Short format.
 */

exports.format('short', ':remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms');

/**
 * Tiny format.
 */

exports.format('tiny', ':method :url :status :res[content-length] - :response-time ms');

/**
 * dev (colored)
 */

exports.format('dev', function(tokens, req, res){
  var color = 32; // green
  var status = res.statusCode;

  if (status >= 500) color = 31; // red
  else if (status >= 400) color = 33; // yellow
  else if (status >= 300) color = 36; // cyan

  var fn = compile('\x1b[0m:method :url \x1b[' + color + 'm:status \x1b[0m:response-time ms - :res[content-length]\x1b[0m');

  return fn(tokens, req, res);
});

/**
 * request url
 */

exports.token('url', function(req){
  return req.originalUrl || req.url;
});

/**
 * request method
 */

exports.token('method', function(req){
  return req.method;
});

/**
 * response time in milliseconds
 */

exports.token('response-time', function(req, res){
  if (!res._header || !req._startAt) return '';
  var diff = process.hrtime(req._startAt);
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(3);
});

/**
 * UTC date
 */

exports.token('date', function(){
  return new Date().toUTCString();
});

/**
 * response status code
 */

exports.token('status', function(req, res){
  return res._header ? res.statusCode : null;
});

/**
 * normalized referrer
 */

exports.token('referrer', function(req){
  return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */

exports.token('remote-addr', getip);

/**
 * remote user
 */

exports.token('remote-user', function (req) {
  var creds = auth(req)
  var user = (creds && creds.name) || '-'
  return user;
})

/**
 * HTTP version
 */

exports.token('http-version', function(req){
  return req.httpVersionMajor + '.' + req.httpVersionMinor;
});

/**
 * UA string
 */

exports.token('user-agent', function(req){
  return req.headers['user-agent'];
});

/**
 * request header
 */

exports.token('req', function(req, res, field){
  return req.headers[field.toLowerCase()];
});

/**
 * response header
 */

exports.token('res', function(req, res, field){
  return (res._headers || {})[field.toLowerCase()];
});

/**
 * Get request IP address.
 */

function getip(req) {
  return req.ip
    || req._remoteAddress
    || (req.connection && req.connection.remoteAddress)
    || undefined;
}
