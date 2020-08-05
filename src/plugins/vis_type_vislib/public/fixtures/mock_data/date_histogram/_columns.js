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
  columns: [
    {
      label: '200: response',
      xAxisLabel: '@timestamp per 30 sec',
      ordered: {
        date: true,
        interval: 30000,
        min: 1415826608440,
        max: 1415827508440,
      },
      yAxisLabel: 'Count of documents',
      xAxisFormatter: function (thing) {
        return moment(thing);
      },
      tooltipFormatter: function (d) {
        return d;
      },
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 1415826600000,
              y: 4,
            },
            {
              x: 1415826630000,
              y: 8,
            },
            {
              x: 1415826660000,
              y: 7,
            },
            {
              x: 1415826690000,
              y: 5,
            },
            {
              x: 1415826720000,
              y: 5,
            },
            {
              x: 1415826750000,
              y: 4,
            },
            {
              x: 1415826780000,
              y: 10,
            },
            {
              x: 1415826810000,
              y: 7,
            },
            {
              x: 1415826840000,
              y: 9,
            },
            {
              x: 1415826870000,
              y: 8,
            },
            {
              x: 1415826900000,
              y: 9,
            },
            {
              x: 1415826930000,
              y: 8,
            },
            {
              x: 1415826960000,
              y: 3,
            },
            {
              x: 1415826990000,
              y: 9,
            },
            {
              x: 1415827020000,
              y: 6,
            },
            {
              x: 1415827050000,
              y: 8,
            },
            {
              x: 1415827080000,
              y: 7,
            },
            {
              x: 1415827110000,
              y: 4,
            },
            {
              x: 1415827140000,
              y: 6,
            },
            {
              x: 1415827170000,
              y: 10,
            },
            {
              x: 1415827200000,
              y: 2,
            },
            {
              x: 1415827230000,
              y: 8,
            },
            {
              x: 1415827260000,
              y: 5,
            },
            {
              x: 1415827290000,
              y: 6,
            },
            {
              x: 1415827320000,
              y: 6,
            },
            {
              x: 1415827350000,
              y: 10,
            },
            {
              x: 1415827380000,
              y: 6,
            },
            {
              x: 1415827410000,
              y: 6,
            },
            {
              x: 1415827440000,
              y: 12,
            },
            {
              x: 1415827470000,
              y: 9,
            },
            {
              x: 1415827500000,
              y: 1,
            },
          ],
        },
      ],
    },
    {
      label: '503: response',
      xAxisLabel: '@timestamp per 30 sec',
      ordered: {
        date: true,
        interval: 30000,
        min: 1415826608440,
        max: 1415827508440,
      },
      yAxisLabel: 'Count of documents',
      xAxisFormatter: function (thing) {
        return moment(thing);
      },
      tooltipFormatter: function (d) {
        return d;
      },
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 1415826630000,
              y: 1,
            },
            {
              x: 1415826660000,
              y: 1,
            },
            {
              x: 1415826720000,
              y: 1,
            },
            {
              x: 1415826780000,
              y: 1,
            },
            {
              x: 1415826900000,
              y: 1,
            },
            {
              x: 1415827020000,
              y: 1,
            },
            {
              x: 1415827080000,
              y: 1,
            },
            {
              x: 1415827110000,
              y: 2,
            },
          ],
        },
      ],
    },
    {
      label: '404: response',
      xAxisLabel: '@timestamp per 30 sec',
      ordered: {
        date: true,
        interval: 30000,
        min: 1415826608440,
        max: 1415827508440,
      },
      yAxisLabel: 'Count of documents',
      xAxisFormatter: function (thing) {
        return moment(thing);
      },
      tooltipFormatter: function (d) {
        return d;
      },
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 1415826660000,
              y: 1,
            },
            {
              x: 1415826720000,
              y: 1,
            },
            {
              x: 1415826810000,
              y: 1,
            },
            {
              x: 1415826960000,
              y: 1,
            },
            {
              x: 1415827050000,
              y: 1,
            },
            {
              x: 1415827260000,
              y: 1,
            },
            {
              x: 1415827380000,
              y: 1,
            },
            {
              x: 1415827410000,
              y: 1,
            },
          ],
        },
      ],
    },
  ],
  xAxisOrderedValues: [
    1415826600000,
    1415826630000,
    1415826660000,
    1415826690000,
    1415826720000,
    1415826750000,
    1415826780000,
    1415826810000,
    1415826840000,
    1415826870000,
    1415826900000,
    1415826930000,
    1415826960000,
    1415826990000,
    1415827020000,
    1415827050000,
    1415827080000,
    1415827110000,
    1415827140000,
    1415827170000,
    1415827200000,
    1415827230000,
    1415827260000,
    1415827290000,
    1415827320000,
    1415827350000,
    1415827380000,
    1415827410000,
    1415827440000,
    1415827470000,
    1415827500000,
  ],
  hits: 225,
};
