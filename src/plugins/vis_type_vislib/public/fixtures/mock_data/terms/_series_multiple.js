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

export default {
  xAxisOrderedValues: ['_all'],
  yAxisLabel: 'Count',
  zAxisLabel: 'machine.os.raw: Descending',
  yScale: null,
  series: [
    {
      label: 'ios',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 2820,
          series: 'ios',
        },
      ],
    },
    {
      label: 'win 7',
      aggId: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 2319,
          series: 'win 7',
        },
      ],
    },
    {
      label: 'win 8',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 1835,
          series: 'win 8',
        },
      ],
    },
    {
      label: 'windows xp service pack 2 version 20123452',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 734,
          series: 'win xp',
        },
      ],
    },
    {
      label: 'osx',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 1352,
          series: 'osx',
        },
      ],
    },
  ],
  hits: 14005,
  xAxisFormatter: function (val) {
    if (_.isObject(val)) {
      return JSON.stringify(val);
    } else if (val == null) {
      return '';
    } else {
      return '' + val;
    }
  },
  yAxisFormatter: function (val) {
    return val;
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
