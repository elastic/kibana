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
import moment from 'moment';

// map of moment's short/long unit ids and elasticsearch's long unit ids
// to their value in milliseconds
const vals = _.transform([
  ['ms', 'milliseconds', 'millisecond'],
  ['s', 'seconds', 'second', 'sec'],
  ['m', 'minutes', 'minute', 'min'],
  ['h', 'hours', 'hour'],
  ['d', 'days', 'day'],
  ['w', 'weeks', 'week'],
  ['M', 'months', 'month'],
  ['quarter'],
  ['y',  'years', 'year']
], function (vals, units) {
  const normal = moment.normalizeUnits(units[0]);
  const val = moment.duration(1, normal).asMilliseconds();
  [].concat(normal, units).forEach(function (unit) {
    vals[unit] = val;
  });
}, {});
// match any key from the vals object preceded by an optional number
const parseRE = new RegExp('^(\\d+(?:\\.\\d*)?)?\\s*(' + _.keys(vals).join('|') + ')$');

export default function (expr) {
  const match = expr.match(parseRE);
  if (match) {
    if (match[2] === 'M' && match[1] !== '1') {
      throw new Error ('Invalid interval. 1M is only valid monthly interval.');
    }

    return parseFloat(match[1] || 1) * vals[match[2]];
  }
}
