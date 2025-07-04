/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

export default {
  rows: [
    {
      label: '200: response',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 25260,
            },
            {
              x: 'png',
              y: 15311,
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
      label: '404: response',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 1352,
            },
            {
              x: 'png',
              y: 826,
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
      label: '503: response',
      xAxisLabel: 'filters',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: 'css',
              y: 761,
            },
            {
              x: 'png',
              y: 527,
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
  hits: 171443,
};
