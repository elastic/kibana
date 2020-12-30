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
      label: 'h3: headings',
      xAxisLabel: 'Top 5 unusual terms in @tags',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'success',
              y: 144000,
            },
            {
              x: 'info',
              y: 128235,
            },
            {
              x: 'security',
              y: 34518,
            },
            {
              x: 'error',
              y: 10257,
            },
            {
              x: 'warning',
              y: 17188,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['success', 'info', 'security', 'error', 'warning'],
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
      label: 'h5: headings',
      xAxisLabel: 'Top 5 unusual terms in @tags',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'success',
              y: 144000,
            },
            {
              x: 'info',
              y: 128235,
            },
            {
              x: 'security',
              y: 34518,
            },
            {
              x: 'error',
              y: 10257,
            },
            {
              x: 'warning',
              y: 17188,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['success', 'info', 'security', 'error', 'warning'],
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
      label: 'http: headings',
      xAxisLabel: 'Top 5 unusual terms in @tags',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'success',
              y: 144000,
            },
            {
              x: 'info',
              y: 128235,
            },
            {
              x: 'security',
              y: 34518,
            },
            {
              x: 'error',
              y: 10257,
            },
            {
              x: 'warning',
              y: 17188,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['success', 'info', 'security', 'error', 'warning'],
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
      label: 'success: headings',
      xAxisLabel: 'Top 5 unusual terms in @tags',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'success',
              y: 120689,
            },
            {
              x: 'info',
              y: 107621,
            },
            {
              x: 'security',
              y: 28916,
            },
            {
              x: 'error',
              y: 8590,
            },
            {
              x: 'warning',
              y: 14548,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['success', 'info', 'security', 'error', 'warning'],
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
      label: 'www.slate.com: headings',
      xAxisLabel: 'Top 5 unusual terms in @tags',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'success',
              y: 62292,
            },
            {
              x: 'info',
              y: 55646,
            },
            {
              x: 'security',
              y: 14823,
            },
            {
              x: 'error',
              y: 4441,
            },
            {
              x: 'warning',
              y: 7539,
            },
          ],
        },
      ],
      xAxisOrderedValues: ['success', 'info', 'security', 'error', 'warning'],
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
  hits: 171445,
};
