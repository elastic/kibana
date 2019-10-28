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

import _ from 'lodash';
import chalk from 'chalk';

import LogFormat from './log_format';

const statuses = [
  'err',
  'info',
  'error',
  'warning',
  'fatal',
  'status',
  'debug'
];

const typeColors = {
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
  'optimize:dynamic_dll_plugin': 'magentaBright',
  'optimize:watch_cache': 'magentaBright',
  listening: 'magentaBright',
  scss: 'magentaBright',
};

const color = _.memoize(function (name) {
  return chalk[typeColors[name]] || _.identity;
});

const type = _.memoize(function (t) {
  return color(t)(_.pad(t, 7).slice(0, 7));
});

const workerType = process.env.kbnWorkerType ? `${type(process.env.kbnWorkerType)} ` : '';

export default class KbnLoggerStringFormat extends LogFormat {
  format(data) {
    const time = color('time')(this.extractAndFormatTimestamp(data, 'HH:mm:ss.SSS'));
    const msg = data.error ? color('error')(data.error.stack) : color('message')(data.message);

    const isColor = tag => color(tag) === _.identity;
    const isStatus = tag => _.includes(statuses, tag);
    const isContext = tag => tag.__kibanaContext__ === true;

    const contextTags = data.tags.filter(isContext).map(tag => tag.value);
    const nonContextTags = data.tags.filter(tag => !isContext(tag));

    const coloredTags = nonContextTags.filter(isColor).sort();
    const statusTags = nonContextTags.filter(isStatus).sort();
    const otherTags = nonContextTags.filter(tag => !isColor(tag) && !isStatus(tag) && !isContext(tag)).sort();

    const tags = [
      ...coloredTags,
      ...statusTags,
      ...contextTags,
      ...otherTags,
    ]
      .reduce(function (s, t) {
        return s + `[${ color(t)(t) }]`;
      }, '');

    return `${workerType}${type(data.type)} [${time}] ${tags} ${msg}`;
  }
}
