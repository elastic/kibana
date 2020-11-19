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

export const seriesMonthlyInterval = {
  label: '',
  xAxisLabel: '@timestamp per month',
  ordered: {
    date: true,
    min: 1451631600000,
    max: 1483254000000,
    interval: 2678000000,
  },
  yAxisLabel: 'Count of documents',
  series: [
    {
      label: 'Count',
      values: [
        {
          x: 1451631600000,
          y: 10220,
        },
        {
          x: 1454310000000,
          y: 9997,
        },
        {
          x: 1456815600000,
          y: 10792,
        },
        {
          x: 1459490400000,
          y: 10262,
        },
        {
          x: 1462082400000,
          y: 10080,
        },
        {
          x: 1464760800000,
          y: 11161,
        },
        {
          x: 1467352800000,
          y: 9933,
        },
        {
          x: 1470031200000,
          y: 10342,
        },
        {
          x: 1472709600000,
          y: 10887,
        },
        {
          x: 1475301600000,
          y: 9666,
        },
        {
          x: 1477980000000,
          y: 9556,
        },
        {
          x: 1480575600000,
          y: 11644,
        },
      ],
    },
  ],
  hits: 533,
  xAxisOrderedValues: [
    1451631600000,
    1454310000000,
    1456815600000,
    1459490400000,
    1462082400000,
    1464760800000,
    1467352800000,
    1470031200000,
    1472709600000,
    1475301600000,
    1477980000000,
    1480575600000,
  ],
  xAxisFormatter: function (thing) {
    return moment(thing);
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
