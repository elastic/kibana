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
      label: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1: agent.raw',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 10379,
            },
            {
              x: 'png',
              y: 6395,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['css', 'png'],
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
      label:
        'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24: agent.raw',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 9253,
            },
            {
              x: 'png',
              y: 5571,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['css', 'png'],
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
      label:
        'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322): agent.raw',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 7740,
            },
            {
              x: 'png',
              y: 4697,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['css', 'png'],
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
  hits: 171443,
};
