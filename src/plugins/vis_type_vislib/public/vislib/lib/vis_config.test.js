/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';

import { VisConfig } from './vis_config';
import { getMockUiState } from '../../fixtures/mocks';

describe('Vislib VisConfig Class Test Suite', function () {
  let el;
  let visConfig;
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

  beforeEach(() => {
    el = d3.select('body').append('div').attr('class', 'visWrapper').node();

    visConfig = new VisConfig(
      {
        type: 'point_series',
      },
      data,
      getMockUiState(),
      el,
      () => undefined
    );
  });

  afterEach(() => {
    el.remove();
  });

  describe('get Method', function () {
    it('should be a function', function () {
      expect(typeof visConfig.get).toBe('function');
    });

    it('should get the property', function () {
      expect(visConfig.get('el')).toBe(el);
      expect(visConfig.get('type')).toBe('point_series');
    });

    it('should return defaults if property does not exist', function () {
      expect(visConfig.get('this.does.not.exist', 'defaults')).toBe('defaults');
    });

    it('should throw an error if property does not exist and defaults were not provided', function () {
      expect(function () {
        visConfig.get('this.does.not.exist');
      }).toThrow();
    });
  });

  describe('set Method', function () {
    it('should be a function', function () {
      expect(typeof visConfig.set).toBe('function');
    });

    it('should set a property', function () {
      visConfig.set('this.does.not.exist', 'it.does.now');
      expect(visConfig.get('this.does.not.exist')).toBe('it.does.now');
    });
  });
});
