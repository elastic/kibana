import Stream from 'stream';
import moment from 'moment';
import { get, _ } from 'lodash';
import numeral from '@elastic/numeral';
import chalk from 'chalk';
import stringify from 'json-stringify-safe';
import querystring from 'querystring';
import applyFiltersToKeys from './apply_filters_to_keys';
import { inspect } from 'util';

function serializeError(err = {}) {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    signal: err.signal
  };
}

const levelColor = function (code) {
  if (code < 299) return chalk.green(code);
  if (code < 399) return chalk.yellow(code);
  if (code < 499) return chalk.magentaBright(code);
  return chalk.red(code);
};


export default class TransformObjStream extends Stream.Transform {
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

  extractAndFormatTimestamp(data, format) {
    const { useUTC } = this.config;
    const date = moment(data['@timestamp']);
    if (useUTC) {
      date.utc();
    }
    return date.format(format);
  }

  readEvent(event) {
    const data = {
      type: event.event,
      '@timestamp': event.timestamp,
      tags: [].concat(event.tags || []),
      pid: event.pid
    };

    if (data.type === 'response') {
      _.defaults(data, _.pick(event, [
        'method',
        'statusCode'
      ]));

      const source = get(event, 'source', {});
      data.req = {
        url: event.path,
        method: event.method || '',
        headers: event.headers,
        remoteAddress: source.remoteAddress,
        userAgent: source.remoteAddress,
        referer: source.referer
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

      data.message = data.req.method.toUpperCase() + ' ';
      data.message += data.req.url;
      data.message += ' ';
      data.message += levelColor(data.res.statusCode);
      data.message += ' ';
      data.message += chalk.gray(data.res.responseTime + 'ms');
      data.message += chalk.gray(' - ' + numeral(contentLength).format('0.0b'));
    }
    else if (data.type === 'ops') {
      _.defaults(data, _.pick(event, [
        'pid',
        'os',
        'proc',
        'load'
      ]));
      data.message  = chalk.gray('memory: ');
      data.message += numeral(get(data, 'proc.mem.heapUsed')).format('0.0b');
      data.message += ' ';
      data.message += chalk.gray('uptime: ');
      data.message += numeral(get(data, 'proc.uptime')).format('00:00:00');
      data.message += ' ';
      data.message += chalk.gray('load: [');
      data.message += get(data, 'os.load', []).map(function (val) {
        return numeral(val).format('0.00');
      }).join(' ');
      data.message += chalk.gray(']');
      data.message += ' ';
      data.message += chalk.gray('delay: ');
      data.message += numeral(get(data, 'proc.delay')).format('0.000');
    }
    else if (data.type === 'error') {
      data.level = 'error';
      data.error = serializeError(event.error);
      data.url = event.url;
      const message =  get(event, 'error.message');
      data.message = message || 'Unknown error (no message)';
    }
    else if (event.data instanceof Error) {
      data.type = 'error';
      data.level = _.contains(event.tags, 'fatal') ? 'fatal' : 'error';
      data.error = serializeError(event.data);
      const message =  get(event, 'data.message');
      data.message = message || 'Unknown error object (no message)';
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
}
