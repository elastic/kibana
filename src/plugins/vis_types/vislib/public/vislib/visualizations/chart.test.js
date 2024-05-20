/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import d3 from 'd3';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '@kbn/test-jest-helpers';
import { Chart } from './_chart';
import { getMockUiState } from '../../fixtures/mocks';
import { getVis } from './_vis_fixture';

describe('Vislib _chart Test Suite', function () {
  let vis;
  let el;
  let myChart;
  let config;
  const data = {
    hits: 621,
    label: '',
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
    xAxisOrderedValues: [
      1408734060000, 1408734090000, 1408734120000, 1408734150000, 1408734180000, 1408734210000,
      1408734240000, 1408734270000, 1408734300000, 1408734330000,
    ],
    series: [
      {
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
    tooltipFormatter: function (datapoint) {
      return datapoint;
    },
    xAxisFormatter: function (thing) {
      return thing;
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  let mockedHTMLElementClientSizes;
  let mockedSVGElementGetBBox;
  let mockedSVGElementGetComputedTextLength;
  let mockWidth;

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(900);
  });

  beforeEach(() => {
    el = d3.select('body').append('div').attr('class', 'column-chart');

    config = {
      type: 'heatmap',
      addLegend: true,
      addTooltip: true,
      colorsNumber: 4,
      colorSchema: 'Greens',
      setColorRange: false,
      percentageMode: true,
      percentageFormatPattern: '0.0%',
      invertColors: false,
      colorsRange: [],
    };
    vis = getVis(config, el[0][0]);
    vis.render(data, getMockUiState());

    myChart = vis.handler.charts[0];
  });

  afterEach(function () {
    el.remove();
    vis.destroy();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
    mockWidth.mockRestore();
  });

  test('should be a constructor for visualization modules', function () {
    expect(myChart instanceof Chart).toBe(true);
  });

  test('should have a render method', function () {
    expect(typeof myChart.render === 'function').toBe(true);
  });
});
