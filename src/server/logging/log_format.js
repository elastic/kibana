import Stream from 'stream';
import moment from 'moment';
import _ from 'lodash';
import numeral from '@spalger/numeral';
import ansicolors from 'ansicolors';
import stringify from 'json-stringify-safe';
import querystring from 'querystring';
import applyFiltersToKeys from './apply_filters_to_keys';
import { inspect } from 'util';

function serializeError(err) {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    signal: err.signal
  };
}

const levelColor = function (code) {
  if (code < 299) return ansicolors.green(code);
  if (code < 399) return ansicolors.yellow(code);
  if (code < 499) return ansicolors.magenta(code);
  return ansicolors.red(code);
};


module.exports = class TransformObjStream extends Stream.Transform {
  constructor(config) {
    super({
      readableObjectMode: false,
      writableObjectMode: true
    });
    this.config = config;
  }

  filter(data) {
    if (!this.config.filter) return data;
    return applyFiltersToKeys(data, this.config.filter);
  }

  _transform(event, enc, next) {
    const data = this.filter(this.readEvent(event));
    this.push(this.format(data) + '\n');
    next();
  }

  readEvent(event) {
    const data = {
      type: event.event,
      '@timestamp': moment.utc(event.timestamp).format(),
      tags: [].concat(event.tags || []),
      pid: event.pid
    };

    if (data.type === 'response') {
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

      let contentLength = 0;
      if (typeof event.responsePayload === 'object') {
        contentLength = stringify(event.responsePayload).length;
      } else {
        contentLength = String(event.responsePayload).length;
      }

      data.res = {
        statusCode: event.statusCode,
        responseTime: event.responseTime,
        contentLength: contentLength
      };

      const query = querystring.stringify(event.query);
      if (query) data.req.url += '?' + query;


      data.message  = data.req.method.toUpperCase() + ' ';
      data.message += data.req.url;
      data.message += ' ';
      data.message += levelColor(data.res.statusCode);
      data.message += ' ';
      data.message += ansicolors.brightBlack(data.res.responseTime + 'ms');
      data.message += ansicolors.brightBlack(' - ' + numeral(contentLength).format('0.0b'));
    }
    else if (data.type === 'ops') {
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
    else if (data.type === 'error') {
      data.level = 'error';
      data.message = event.error.message;
      data.error = serializeError(event.error);
      data.url = event.url;
    }
    else if (event.data instanceof Error) {
      data.level = _.contains(event.tags, 'fatal') ? 'fatal' : 'error';
      data.message = event.data.message;
      data.error = serializeError(event.data);
    }
    else if (_.isPlainObject(event.data) && event.data.tmpl) {
      _.assign(data, event.data);
      data.tmpl = undefined;
      data.message = _.template(event.data.tmpl)(event.data);
    }
    else {
      data.message = _.isString(event.data) ? event.data : inspect(event.data);
    }
    return data;
  }
};
