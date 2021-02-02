/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

export default {
  label: '',
  xAxisLabel: 'Top 5 extension',
  xAxisOrderedValues: ['jpg', 'css', 'png', 'gif', 'php'],
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
          y: 27389,
        },
        {
          x: 'png',
          y: 16661,
        },
        {
          x: 'gif',
          y: 11269,
        },
        {
          x: 'php',
          y: 5447,
        },
      ],
    },
  ],
  hits: 171476,
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
