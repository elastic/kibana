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
  columns: [
    {
      label: 'apache: _type',
      xAxisLabel: 'bytes ranges',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: '0.0-1000.0',
              y: 13309,
            },
            {
              x: '1000.0-2000.0',
              y: 7196,
            },
          ],
        },
      ],
    },
    {
      label: 'nginx: _type',
      xAxisLabel: 'bytes ranges',
      yAxisLabel: 'Count of documents',
      series: [
        {
          label: 'Count',
          values: [
            {
              x: '0.0-1000.0',
              y: 3278,
            },
            {
              x: '1000.0-2000.0',
              y: 1804,
            },
          ],
        },
      ],
    },
  ],
  hits: 171499,
  xAxisOrderedValues: ['0.0-1000.0', '1000.0-2000.0'],
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
};
