var moment = require('moment');
var _ = require('lodash');
var env = process.env.NODE_ENV || 'development';
var numeral = require('numeral');
var ansicolors = require('ansicolors');
var stringify = require('json-stringify-safe');
var querystring = require('querystring');

function serializeError(err) {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    signal: err.signal
  };
}


var levelColor = function (code) {
  if (code < 299) {
    return ansicolors.green(code);
  }
  if (code < 399) {
    return ansicolors.yellow(code);
  }
  if (code < 499) {
    return ansicolors.magenta(code);
  }
  return ansicolors.red(code);
};

function lookup(name) {
  switch (name) {
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

module.exports = function (name, event) {
  var data = {
    '@timestamp': moment.utc(event.timestamp).format(),
    level: lookup(event),
    node_env: env,
    tags: event.tags,
    pid: event.pid
  };
  if (name === 'response') {
    _.defaults(data, _.pick(event, [
      'method',
      'statusCode'
    ]));

    data.req = {
      url: event.path,
      method: event.method,
      headers: event.headers,
      remoteAddress: event.source.remoteAddress,
      userAgent: event.source.remoteAddress,
      referer: event.source.referer
    };

    var contentLength = 0;
    if (typeof event.responsePayload === 'object') {
      contentLength = stringify(event.responsePayload).length;
    } else {
      contentLength = event.responsePayload.toString().length;
    }

    data.res = {
      statusCode: event.statusCode,
      responseTime: event.responseTime,
      contentLength: contentLength
    };

    var query = querystring.stringify(event.query);
    if (query) data.req.url += '?' + query;


    data.message  = data.req.method.toUpperCase() + ' ';
    data.message += data.req.url;
    data.message += ' ';
    data.message += levelColor(data.res.statusCode);
    data.message += ' ';
    data.message += ansicolors.brightBlack(data.res.responseTime + 'ms');
    data.message += ansicolors.brightBlack(' - ' + numeral(contentLength).format('0.0b'));
  }
  else if (name === 'ops') {
    _.defaults(data, _.pick(event, [
      'pid',
      'os',
      'proc',
      'load'
    ]));
    data.message  = ansicolors.brightBlack('memory: ');
    data.message += numeral(data.proc.mem.heapUsed).format('0.0b');
    data.message += ' ';
    data.message += ansicolors.brightBlack('uptime: ');
    data.message += numeral(data.proc.uptime).format('00:00:00');
    data.message += ' ';
    data.message += ansicolors.brightBlack('load: [');
    data.message += data.os.load.map(function (val) {
      return numeral(val).format('0.00');
    }).join(' ');
    data.message += ansicolors.brightBlack(']');
    data.message += ' ';
    data.message += ansicolors.brightBlack('delay: ');
    data.message += numeral(data.proc.delay).format('0.000');
  }
  else if (name === 'error') {
    data.level = 'error';
    data.message = event.error.message;
    data.error = serializeError(event.error);
    data.url = event.url;
  }
  else {
    if (event.data instanceof Error) {
      data.level = _.contains(event.tags, 'fatal') ? 'fatal' : 'error';
      data.message = event.data.message;
      data.error = serializeError(event.data);
    } else {
      data.message = event.data;
    }
  }
  return data;
};
