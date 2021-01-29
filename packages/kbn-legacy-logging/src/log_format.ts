/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Stream from 'stream';
import moment from 'moment-timezone';
import _ from 'lodash';
import queryString from 'query-string';
import numeral from '@elastic/numeral';
import chalk from 'chalk';
// @ts-expect-error missing type def
import stringify from 'json-stringify-safe';
import { inspect } from 'util';

import { applyFiltersToKeys } from './utils';
import { getLogEventData } from './metadata';
import { LegacyLoggingConfig } from './schema';
import {
  AnyEvent,
  isResponseEvent,
  isOpsEvent,
  isErrorEvent,
  isLogEvent,
  isUndeclaredErrorEvent,
} from './log_events';

export type LogFormatConfig = Pick<LegacyLoggingConfig, 'json' | 'dest' | 'timezone' | 'filter'>;

function serializeError(err: any = {}) {
  return {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
    signal: err.signal,
  };
}

const levelColor = function (code: number) {
  if (code < 299) return chalk.green(String(code));
  if (code < 399) return chalk.yellow(String(code));
  if (code < 499) return chalk.magentaBright(String(code));
  return chalk.red(String(code));
};

export abstract class BaseLogFormat extends Stream.Transform {
  constructor(private readonly config: LogFormatConfig) {
    super({
      readableObjectMode: false,
      writableObjectMode: true,
    });
  }

  abstract format(data: Record<string, any>): string;

  filter(data: Record<string, unknown>) {
    if (!this.config.filter) {
      return data;
    }
    return applyFiltersToKeys(data, this.config.filter);
  }

  _transform(event: AnyEvent, enc: string, next: Stream.TransformCallback) {
    const data = this.filter(this.readEvent(event));
    this.push(this.format(data) + '\n');
    next();
  }

  extractAndFormatTimestamp(data: Record<string, any>, format?: string) {
    const { timezone } = this.config;
    const date = moment(data['@timestamp']);
    if (timezone) {
      date.tz(timezone);
    }
    return date.format(format);
  }

  readEvent(event: AnyEvent) {
    const data: Record<string, any> = {
      type: event.event,
      '@timestamp': event.timestamp,
      tags: [...(event.tags || [])],
      pid: event.pid,
    };

    if (isResponseEvent(event)) {
      _.defaults(data, _.pick(event, ['method', 'statusCode']));

      const source = _.get(event, 'source', {});
      data.req = {
        url: event.path,
        method: event.method || '',
        headers: event.headers,
        remoteAddress: source.remoteAddress,
        userAgent: source.userAgent,
        referer: source.referer,
      };

      const contentLength =
        event.responsePayload === 'object'
          ? stringify(event.responsePayload).length
          : String(event.responsePayload).length;

      data.res = {
        statusCode: event.statusCode,
        responseTime: event.responseTime,
        contentLength,
      };

      const query = queryString.stringify(event.query, { sort: false });
      if (query) {
        data.req.url += '?' + query;
      }

      data.message = data.req.method.toUpperCase() + ' ';
      data.message += data.req.url;
      data.message += ' ';
      data.message += levelColor(data.res.statusCode);
      data.message += ' ';
      data.message += chalk.gray(data.res.responseTime + 'ms');
      data.message += chalk.gray(' - ' + numeral(contentLength).format('0.0b'));
    } else if (isOpsEvent(event)) {
      _.defaults(data, _.pick(event, ['pid', 'os', 'proc', 'load']));
      data.message = chalk.gray('memory: ');
      data.message += numeral(_.get(data, 'proc.mem.heapUsed')).format('0.0b');
      data.message += ' ';
      data.message += chalk.gray('uptime: ');
      data.message += numeral(_.get(data, 'proc.uptime')).format('00:00:00');
      data.message += ' ';
      data.message += chalk.gray('load: [');
      data.message += _.get(data, 'os.load', [])
        .map((val: number) => {
          return numeral(val).format('0.00');
        })
        .join(' ');
      data.message += chalk.gray(']');
      data.message += ' ';
      data.message += chalk.gray('delay: ');
      data.message += numeral(_.get(data, 'proc.delay')).format('0.000');
    } else if (isErrorEvent(event)) {
      data.level = 'error';
      data.error = serializeError(event.error);
      data.url = event.url;
      const message = _.get(event, 'error.message');
      data.message = message || 'Unknown error (no message)';
    } else if (isUndeclaredErrorEvent(event)) {
      data.type = 'error';
      data.level = _.includes(event.tags, 'fatal') ? 'fatal' : 'error';
      data.error = serializeError(event.error);
      const message = _.get(event, 'error.message');
      data.message = message || 'Unknown error object (no message)';
    } else if (isLogEvent(event)) {
      _.assign(data, getLogEventData(event.data));
    } else {
      data.message = _.isString(event.data) ? event.data : inspect(event.data);
    }
    return data;
  }
}
