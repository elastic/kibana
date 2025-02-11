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
  xAxisOrderedValues: ['_all'],
  yAxisLabel: 'Count',
  zAxisLabel: 'machine.os.raw: Descending',
  yScale: null,
  series: [
    {
      label: 'ios',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 2820,
          series: 'ios',
        },
      ],
    },
    {
      label: 'win 7',
      aggId: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 2319,
          series: 'win 7',
        },
      ],
    },
    {
      label: 'win 8',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 1835,
          series: 'win 8',
        },
      ],
    },
    {
      label: 'windows xp service pack 2 version 20123452',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 734,
          series: 'win xp',
        },
      ],
    },
    {
      label: 'osx',
      id: '1',
      yAxisFormatter: _.identity,
      values: [
        {
          x: '_all',
          y: 1352,
          series: 'osx',
        },
      ],
    },
  ],
  hits: 14005,
  xAxisFormatter: function (val) {
    if (_.isObject(val)) {
      return JSON.stringify(val);
    } else if (val == null) {
      return '';
    } else {
      return '' + val;
    }
  },
  yAxisFormatter: function (val) {
    return val;
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
