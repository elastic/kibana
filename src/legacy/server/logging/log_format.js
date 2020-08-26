/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Stream from 'stream';
import moment from 'moment-timezone';
import { get, _ } from 'lodash';
import queryString from 'query-string';
import numeral from '@elastic/numeral';
import chalk from 'chalk';
import stringify from 'json-stringify-safe';
import applyFiltersToKeys from './apply_filters_to_keys';
import { inspect } from 'util';
import { logWithMetadata } from './log_with_metadata';

function serializeError(err = {}) {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    signal: err.signal,
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
      writableObjectMode: true,
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
    const { timezone } = this.config;
    const date = moment(data['@timestamp']);
    if (timezone) {
      date.tz(timezone);
    }
    return date.format(format);
  }

  readEvent(event) {
    const data = {
      type: event.event,
      '@timestamp': event.timestamp,
      tags: [].concat(event.tags || []),
      pid: event.pid,
    };

    if (data.type === 'response') {
      _.defaults(data, _.pick(event, ['method', 'statusCode']));

      const source = get(event, 'source', {});
      data.req = {
        url: event.path,
        method: event.method || '',
        headers: event.headers,
        remoteAddress: source.remoteAddress,
        userAgent: source.remoteAddress,
        referer: source.referer,
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
        contentLength: contentLength,
      };

      const query = queryString.stringify(event.query, { sort: false });
      if (query) data.req.url += '?' + query;

      data.message = data.req.method.toUpperCase() + ' ';
      data.message += data.req.url;
      data.message += ' ';
      data.message += levelColor(data.res.statusCode);
      data.message += ' ';
      data.message += chalk.gray(data.res.responseTime + 'ms');
      data.message += chalk.gray(' - ' + numeral(contentLength).format('0.0b'));
    } else if (data.type === 'ops') {
      _.defaults(data, _.pick(event, ['pid', 'os', 'proc', 'load']));
      data.message = chalk.gray('memory: ');
      data.message += numeral(get(data, 'proc.mem.heapUsed')).format('0.0b');
      data.message += ' ';
      data.message += chalk.gray('uptime: ');
      data.message += numeral(get(data, 'proc.uptime')).format('00:00:00');
      data.message += ' ';
      data.message += chalk.gray('load: [');
      data.message += get(data, 'os.load', [])
        .map(function (val) {
          return numeral(val).format('0.00');
        })
        .join(' ');
      data.message += chalk.gray(']');
      data.message += ' ';
      data.message += chalk.gray('delay: ');
      data.message += numeral(get(data, 'proc.delay')).format('0.000');
    } else if (data.type === 'error') {
      data.level = 'error';
      data.error = serializeError(event.error);
      data.url = event.url;
      const message = get(event, 'error.message');
      data.message = message || 'Unknown error (no message)';
    } else if (event.error instanceof Error) {
      data.type = 'error';
      data.level = _.includes(event.tags, 'fatal') ? 'fatal' : 'error';
      data.error = serializeError(event.error);
      const message = get(event, 'error.message');
      data.message = message || 'Unknown error object (no message)';
    } else if (logWithMetadata.isLogEvent(event.data)) {
      _.assign(data, logWithMetadata.getLogEventData(event.data));
    } else {
      data.message = _.isString(event.data) ? event.data : inspect(event.data);
    }
    return data;
  }
}
