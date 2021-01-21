/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

export const seriesMonthlyInterval = {
  label: '',
  xAxisLabel: '@timestamp per month',
  ordered: {
    date: true,
    min: 1451631600000,
    max: 1483254000000,
    interval: 2678000000,
  },
  yAxisLabel: 'Count of documents',
  series: [
    {
      label: 'Count',
      values: [
        {
          x: 1451631600000,
          y: 10220,
        },
        {
          x: 1454310000000,
          y: 9997,
        },
        {
          x: 1456815600000,
          y: 10792,
        },
        {
          x: 1459490400000,
          y: 10262,
        },
        {
          x: 1462082400000,
          y: 10080,
        },
        {
          x: 1464760800000,
          y: 11161,
        },
        {
          x: 1467352800000,
          y: 9933,
        },
        {
          x: 1470031200000,
          y: 10342,
        },
        {
          x: 1472709600000,
          y: 10887,
        },
        {
          x: 1475301600000,
          y: 9666,
        },
        {
          x: 1477980000000,
          y: 9556,
        },
        {
          x: 1480575600000,
          y: 11644,
        },
      ],
    },
  ],
  hits: 533,
  xAxisOrderedValues: [
    1451631600000,
    1454310000000,
    1456815600000,
    1459490400000,
    1462082400000,
    1464760800000,
    1467352800000,
    1470031200000,
    1472709600000,
    1475301600000,
    1477980000000,
    1480575600000,
  ],
  xAxisFormatter: function (thing) {
    return moment(thing);
  },
  tooltipFormatter: function (d) {
    return d;
  },
};
