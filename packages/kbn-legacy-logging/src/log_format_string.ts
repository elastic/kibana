/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import chalk from 'chalk';

import { BaseLogFormat } from './log_format';

const statuses = ['err', 'info', 'error', 'warning', 'fatal', 'status', 'debug'];

const typeColors: Record<string, string> = {
  log: 'white',
  req: 'green',
  res: 'green',
  ops: 'cyan',
  config: 'cyan',
  err: 'red',
  info: 'green',
  error: 'red',
  warning: 'red',
  fatal: 'magentaBright',
  status: 'yellowBright',
  debug: 'gray',
  server: 'gray',
  optmzr: 'white',
  manager: 'green',
  optimize: 'magentaBright',
  listening: 'magentaBright',
  scss: 'magentaBright',
};

const color = _.memoize((name: string): ((...text: string[]) => string) => {
  // @ts-expect-error couldn't even get rid of the error with an any cast
  return chalk[typeColors[name]] || _.identity;
});

const type = _.memoize((t: string) => {
  return color(t)(_.pad(t, 7).slice(0, 7));
});

const prefix = process.env.isDevCliChild ? `${type('server')} ` : '';

export class KbnLoggerStringFormat extends BaseLogFormat {
  format(data: Record<string, any>) {
    const time = color('time')(this.extractAndFormatTimestamp(data, 'HH:mm:ss.SSS'));
    const msg = data.error ? color('error')(data.error.stack) : color('message')(data.message);

    const tags = _(data.tags)
      .sortBy(function (tag) {
        if (color(tag) === _.identity) return `2${tag}`;
        if (_.includes(statuses, tag)) return `0${tag}`;
        return `1${tag}`;
      })
      .reduce(function (s, t) {
        return s + `[${color(t)(t)}]`;
      }, '');

    return `${prefix}${type(data.type)} [${time}] ${tags} ${msg}`;
  }
}
