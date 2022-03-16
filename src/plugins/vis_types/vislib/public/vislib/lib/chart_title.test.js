/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import d3 from 'd3';
import _ from 'lodash';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '@kbn/test-jest-helpers';

import { ChartTitle } from './chart_title';
import { VisConfig } from './vis_config';
import { getMockUiState } from '../../fixtures/mocks';

describe('Vislib ChartTitle Class Test Suite', function () {
  let mockUiState;
  let chartTitle;
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

  let mockedHTMLElementClientSizes;
  let mockedSVGElementGetBBox;
  let mockedSVGElementGetComputedTextLength;

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
  });

  beforeEach(() => {
    mockUiState = getMockUiState();
    el = d3.select('body').append('div').attr('class', 'visWrapper').datum(data);

    el.append('div').attr('class', 'chart-title').style('height', '20px');

    const visConfig = new VisConfig(
      {
        type: 'heatmap',
        title: {
          text: 'rows',
        },
      },
      data,
      mockUiState,
      el.node(),
      () => undefined
    );
    chartTitle = new ChartTitle(visConfig);
  });

  afterEach(function () {
    el.remove();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
  });

  describe('render Method', function () {
    beforeEach(function () {
      chartTitle.render();
    });

    test('should append an svg to div', function () {
      expect(el.select('.chart-title').selectAll('svg').length).toBe(1);
    });

    test('should append text', function () {
      expect(!!el.select('.chart-title').selectAll('svg').selectAll('text')).toBe(true);
    });
  });

  describe('draw Method', function () {
    test('should be a function', function () {
      expect(_.isFunction(chartTitle.draw())).toBe(true);
    });
  });
});
