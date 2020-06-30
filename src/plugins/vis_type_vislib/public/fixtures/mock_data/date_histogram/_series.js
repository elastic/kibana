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

export default {
  label: '',
  xAxisLabel: '@timestamp per 30 sec',
  ordered: {
    date: true,
    min: 1411761457636,
    max: 1411762357636,
    interval: 30000,
  },
  yAxisLabel: 'Count of documents',
  series: [
    {
      label: 'Count',
      values: [
        {
          x: 1411761450000,
          y: 41,
        },
        {
          x: 1411761480000,
          y: 18,
        },
        {
          x: 1411761510000,
          y: 22,
        },
        {
          x: 1411761540000,
          y: 17,
        },
        {
          x: 1411761570000,
          y: 17,
        },
        {
          x: 1411761600000,
          y: 21,
        },
        {
          x: 1411761630000,
          y: 16,
        },
        {
          x: 1411761660000,
          y: 17,
        },
        {
          x: 1411761690000,
          y: 15,
        },
        {
          x: 1411761720000,
          y: 19,
        },
        {
          x: 1411761750000,
          y: 11,
        },
        {
          x: 1411761780000,
          y: 13,
        },
        {
          x: 1411761810000,
          y: 24,
        },
        {
          x: 1411761840000,
          y: 20,
        },
        {
          x: 1411761870000,
          y: 20,
        },
        {
          x: 1411761900000,
          y: 21,
        },
        {
          x: 1411761930000,
          y: 17,
        },
        {
          x: 1411761960000,
          y: 20,
        },
        {
          x: 1411761990000,
          y: 13,
        },
        {
          x: 1411762020000,
          y: 14,
        },
        {
          x: 1411762050000,
          y: 25,
        },
        {
          x: 1411762080000,
          y: 17,
        },
        {
          x: 1411762110000,
          y: 14,
        },
        {
          x: 1411762140000,
          y: 22,
        },
        {
          x: 1411762170000,
          y: 14,
        },
        {
          x: 1411762200000,
          y: 19,
        },
        {
          x: 1411762230000,
          y: 22,
        },
        {
          x: 1411762260000,
          y: 17,
        },
        {
          x: 1411762290000,
          y: 8,
        },
        {
          x: 1411762320000,
          y: 15,
        },
        {
          x: 1411762350000,
          y: 4,
        },
      ],
    },
  ],
  hits: 533,
  xAxisOrderedValues: [
    1411761450000,
    1411761480000,
    1411761510000,
    1411761540000,
    1411761570000,
    1411761600000,
    1411761630000,
    1411761660000,
    1411761690000,
    1411761720000,
    1411761750000,
    1411761780000,
    1411761810000,
    1411761840000,
    1411761870000,
    1411761900000,
    1411761930000,
    1411761960000,
    1411761990000,
    1411762020000,
    1411762050000,
    1411762080000,
    1411762110000,
    1411762140000,
    1411762170000,
    1411762200000,
    1411762230000,
    1411762260000,
    1411762290000,
    1411762320000,
    1411762350000,
  ],
  xAxisFormatter: function (thing) {
    return moment(thing);
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
