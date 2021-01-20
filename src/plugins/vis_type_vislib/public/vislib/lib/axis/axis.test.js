/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';

import { Axis } from './axis';
import { VisConfig } from '../vis_config';
import { getMockUiState } from '../../../fixtures/mocks';

describe('Vislib Axis Class Test Suite', function () {
  let mockUiState;
  let yAxis;
  let el;
  let fixture;
  let seriesData;

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
            x: 1408734130000,
            y: 30,
          },
          {
            x: 1408734150000,
            y: 28,
          },
        ],
      },
      {
        label: 'Count2',
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
            x: 1408734140000,
            y: 30,
          },
          {
            x: 1408734150000,
            y: 28,
          },
        ],
      },
    ],
    xAxisFormatter: function (thing) {
      return new Date(thing);
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  beforeEach(() => {
    mockUiState = getMockUiState();
    el = d3.select('body').append('div').attr('class', 'visAxis--x').style('height', '40px');

    fixture = el.append('div').attr('class', 'x-axis-div');

    const visConfig = new VisConfig(
      {
        type: 'histogram',
      },
      data,
      mockUiState,
      $('.x-axis-div')[0],
      () => undefined
    );
    yAxis = new Axis(visConfig, {
      type: 'value',
      id: 'ValueAxis-1',
    });

    seriesData = data.series.map((series) => {
      return series.values;
    });
  });

  afterEach(function () {
    fixture.remove();
    el.remove();
  });

  describe('_stackNegAndPosVals Method', function () {
    it('should correctly stack positive values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8,
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 23,
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30,
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0,
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28,
        },
      ];
      const stackedData = yAxis._stackNegAndPosVals(seriesData);
      expect(stackedData[1]).toEqual(expectedResult);
    });

    it('should correctly stack pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 0,
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0,
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 0,
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0,
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 0,
        },
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach((value) => {
        value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).toEqual(expectedResult);
    });

    it('should correctly stack mixed pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8,
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0,
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30,
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0,
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28,
        },
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach((value, i) => {
        if (i % 2 === 1) value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).toEqual(expectedResult);
    });
  });
});
