/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
