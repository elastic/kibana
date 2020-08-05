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
  rows: [
    {
      label: '0.0-1000.0: bytes',
      xAxisLabel: 'Top 5 extension',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'jpg',
              y: 3378,
            },
            {
              x: 'css',
              y: 762,
            },
            {
              x: 'png',
              y: 527,
            },
            {
              x: 'gif',
              y: 11258,
            },
            {
              x: 'php',
              y: 653,
            },
          ],
        },
      ],
      xAxisFormatter: function (val) {
        if (_.isObject(val)) {
          return JSON.stringify(val);
        } else if (val == null) {
          return '';
        } else {
          return '' + val;
        }
      },
      tooltipFormatter: function (d) {
        return d;
      },
    },
    {
      label: '1000.0-2000.0: bytes',
      xAxisLabel: 'Top 5 extension',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'jpg',
              y: 6422,
            },
            {
              x: 'css',
              y: 1591,
            },
            {
              x: 'png',
              y: 430,
            },
            {
              x: 'gif',
              y: 8,
            },
            {
              x: 'php',
              y: 561,
            },
          ],
        },
      ],
      xAxisFormatter: function (val) {
        if (_.isObject(val)) {
          return JSON.stringify(val);
        } else if (val == null) {
          return '';
        } else {
          return '' + val;
        }
      },
      tooltipFormatter: function (d) {
        return d;
      },
    },
  ],
  xAxisOrderedValues: ['jpg', 'css', 'png', 'gif', 'php'],
  hits: 171458,
};
