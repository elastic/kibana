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
  columns: [
    {
      label: 'logstash: index',
      xAxisLabel: 'Top 5 extension',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'jpg',
              y: 110710,
            },
            {
              x: 'css',
              y: 27376,
            },
            {
              x: 'png',
              y: 16664,
            },
            {
              x: 'gif',
              y: 11264,
            },
            {
              x: 'php',
              y: 5448,
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
      label: '2014.11.12: index',
      xAxisLabel: 'Top 5 extension',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'jpg',
              y: 110643,
            },
            {
              x: 'css',
              y: 27350,
            },
            {
              x: 'png',
              y: 16648,
            },
            {
              x: 'gif',
              y: 11257,
            },
            {
              x: 'php',
              y: 5440,
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
      label: '2014.11.11: index',
      xAxisLabel: 'Top 5 extension',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'jpg',
              y: 67,
            },
            {
              x: 'css',
              y: 26,
            },
            {
              x: 'png',
              y: 16,
            },
            {
              x: 'gif',
              y: 7,
            },
            {
              x: 'php',
              y: 8,
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
  hits: 171462,
};
