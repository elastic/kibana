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

import moment from 'moment';

export const dateRange = {
  toString: function (range, format) {
    if (!range.from) {
      return 'Before ' + format(range.to);
    } else if (!range.to) {
      return 'After ' + format(range.from);
    } else {
      return format(range.from) + ' to ' + format(range.to);
    }
  },
  parse: function (rangeString, format) {
    let chunks = rangeString.split(' to ');
    if (chunks.length === 2) return { from: moment(chunks[0], format), to: moment(chunks[1], format) };

    chunks = rangeString.split('Before ');
    if (chunks.length === 2) return { to: moment(chunks[1], format) };

    chunks = rangeString.split('After ');
    if (chunks.length === 2) return { from: moment(chunks[1], format) };

    throw new Error('Error attempting to parse date range: ' + rangeString);
  }
};
