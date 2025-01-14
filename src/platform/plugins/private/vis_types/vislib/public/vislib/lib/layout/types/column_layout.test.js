/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import d3 from 'd3';
import _ from 'lodash';

import { layoutTypes } from '../layout_types';

describe('Vislib Column Layout Test Suite', function () {
  let columnLayout;
  let el;
  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
    series: [
      {
        label: 'Count',
        values: [
          {
            x: 1408734060000,
            y: 8,
          },
          {
            x: 1408734090000,
            y: 23,
          },
          {
            x: 1408734120000,
            y: 30,
          },
          {
            x: 1408734150000,
            y: 28,
          },
          {
            x: 1408734180000,
            y: 36,
          },
          {
            x: 1408734210000,
            y: 30,
          },
          {
            x: 1408734240000,
            y: 26,
          },
          {
            x: 1408734270000,
            y: 22,
          },
          {
            x: 1408734300000,
            y: 29,
          },
          {
            x: 1408734330000,
            y: 24,
          },
        ],
      },
    ],
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  beforeEach(function () {
    el = d3.select('body').append('div').attr('class', 'visualization');
    columnLayout = layoutTypes.point_series(el, data);
  });

  afterEach(function () {
    el.remove();
  });

  it('should return an array of objects', function () {
    expect(Array.isArray(columnLayout)).toBe(true);
    expect(_.isObject(columnLayout[0])).toBe(true);
  });

  it('should throw an error when the wrong number or no arguments provided', function () {
    expect(function () {
      layoutTypes.point_series(el);
    }).toThrow();
  });
});
