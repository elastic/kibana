/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '../../../../../../test_utils/public';

// Data
import series from '../../../fixtures/mock_data/date_histogram/_series';
import seriesPosNeg from '../../../fixtures/mock_data/date_histogram/_series_pos_neg';
import seriesNeg from '../../../fixtures/mock_data/date_histogram/_series_neg';
import termsColumns from '../../../fixtures/mock_data/terms/_columns';
import histogramRows from '../../../fixtures/mock_data/histogram/_rows';
import stackedSeries from '../../../fixtures/mock_data/date_histogram/_stacked_series';

import { seriesMonthlyInterval } from '../../../fixtures/mock_data/date_histogram/_series_monthly_interval';
import { rowsSeriesWithHoles } from '../../../fixtures/mock_data/date_histogram/_rows_series_with_holes';
import rowsWithZeros from '../../../fixtures/mock_data/date_histogram/_rows';
import { getMockUiState } from '../../../fixtures/mocks';
import { getVis } from '../_vis_fixture';

// tuple, with the format [description, mode, data]
const dataTypesArray = [
  ['series', 'stacked', series],
  ['series with positive and negative values', 'stacked', seriesPosNeg],
  ['series with negative values', 'stacked', seriesNeg],
  ['terms columns', 'grouped', termsColumns],
  ['histogram rows', 'percentage', histogramRows],
  ['stackedSeries', 'stacked', stackedSeries],
];

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;

dataTypesArray.forEach(function (dataType) {
  const name = dataType[0];
  const mode = dataType[1];
  const data = dataType[2];

  describe('Vislib Column Chart Test Suite for ' + name + ' Data', function () {
    let vis;
    let mockUiState;
    const visLibParams = {
      type: 'histogram',
      addLegend: true,
      addTooltip: true,
      mode: mode,
      zeroFill: true,
      grid: {
        categoryLines: true,
        valueAxis: 'ValueAxis-1',
      },
    };

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    });

    beforeEach(() => {
      vis = getVis(visLibParams);
      mockUiState = getMockUiState();
      vis.on('brush', _.noop);
      vis.render(data, mockUiState);
    });

    afterEach(function () {
      vis.destroy();
    });

    afterAll(() => {
      mockedHTMLElementClientSizes.mockRestore();
      mockedSVGElementGetBBox.mockRestore();
      mockedSVGElementGetComputedTextLength.mockRestore();
    });

    describe('stackData method', function () {
      let stackedData;
      let isStacked;

      beforeEach(function () {
        vis.handler.charts.forEach(function (chart) {
          stackedData = chart.chartData;

          isStacked = stackedData.series.every(function (arr) {
            return arr.values.every(function (d) {
              return _.isNumber(d.y0);
            });
          });
        });
      });

      test('should stack values when mode is stacked', function () {
        if (mode === 'stacked') {
          expect(isStacked).toBe(true);
        }
      });

      test('should stack values when mode is percentage', function () {
        if (mode === 'percentage') {
          expect(isStacked).toBe(true);
        }
      });
    });

    describe('addBars method', function () {
      test('should append rects', function () {
        let numOfSeries;
        let numOfValues;
        let product;

        vis.handler.charts.forEach(function (chart) {
          numOfSeries = chart.chartData.series.length;
          numOfValues = chart.chartData.series[0].values.length;
          product = numOfSeries * numOfValues;
          expect($(chart.chartEl).find('.series rect')).toHaveLength(product);
        });
      });
    });

    describe('addBarEvents method', function () {
      function checkChart(chart) {
        const rect = $(chart.chartEl).find('.series rect').get(0);

        // check for existence of stuff and things
        return {
          click: !!rect.__onclick,
          mouseOver: !!rect.__onmouseover,
          // D3 brushing requires that a g element is appended that
          // listens for mousedown events. This g element includes
          // listeners, however, I was not able to test for the listener
          // function being present. I will need to update this test
          // in the future.
          brush: !!d3.select('.brush')[0][0],
        };
      }

      test('should attach the brush if data is a set is ordered', function () {
        vis.handler.charts.forEach(function (chart) {
          const has = checkChart(chart);
          const ordered = vis.handler.data.get('ordered');
          const allowBrushing = Boolean(ordered);
          expect(has.brush).toBe(allowBrushing);
        });
      });

      test('should attach a click event', function () {
        vis.handler.charts.forEach(function (chart) {
          const has = checkChart(chart);
          expect(has.click).toBe(true);
        });
      });

      test('should attach a hover event', function () {
        vis.handler.charts.forEach(function (chart) {
          const has = checkChart(chart);
          expect(has.mouseOver).toBe(true);
        });
      });
    });

    describe('draw method', function () {
      test('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(_.isFunction(chart.draw())).toBe(true);
        });
      });

      test('should return a yMin and yMax', function () {
        vis.handler.charts.forEach(function (chart) {
          const yAxis = chart.handler.valueAxes[0];
          const domain = yAxis.getScale().domain();

          expect(domain[0]).not.toBe(undefined);
          expect(domain[1]).not.toBe(undefined);
        });
      });

      test('should render a zero axis line', function () {
        vis.handler.charts.forEach(function (chart) {
          const yAxis = chart.handler.valueAxes[0];

          if (yAxis.yMin < 0 && yAxis.yMax > 0) {
            expect($(chart.chartEl).find('line.zero-line').length).toBe(1);
          }
        });
      });
    });

    describe('defaultYExtents is true', function () {
      beforeEach(function () {
        vis.visConfigArgs.defaultYExtents = true;
        vis.render(data, mockUiState);
      });

      test('should return yAxis extents equal to data extents', function () {
        vis.handler.charts.forEach(function (chart) {
          const yAxis = chart.handler.valueAxes[0];
          const min = vis.handler.valueAxes[0].axisScale.getYMin();
          const max = vis.handler.valueAxes[0].axisScale.getYMax();
          const domain = yAxis.getScale().domain();
          expect(domain[0]).toEqual(min);
          expect(domain[1]).toEqual(max);
        });
      });
    });
    [0, 2, 4, 8].forEach(function (boundsMarginValue) {
      describe('defaultYExtents is true and boundsMargin is defined', function () {
        beforeEach(function () {
          vis.visConfigArgs.defaultYExtents = true;
          vis.visConfigArgs.boundsMargin = boundsMarginValue;
          vis.render(data, mockUiState);
        });

        test('should return yAxis extents equal to data extents with boundsMargin', function () {
          vis.handler.charts.forEach(function (chart) {
            const yAxis = chart.handler.valueAxes[0];
            const min = vis.handler.valueAxes[0].axisScale.getYMin();
            const max = vis.handler.valueAxes[0].axisScale.getYMax();
            const domain = yAxis.getScale().domain();
            if (min < 0 && max < 0) {
              expect(domain[0]).toEqual(min);
              expect(domain[1] - boundsMarginValue).toEqual(max);
            } else if (min > 0 && max > 0) {
              expect(domain[0] + boundsMarginValue).toEqual(min);
              expect(domain[1]).toEqual(max);
            } else {
              expect(domain[0]).toEqual(min);
              expect(domain[1]).toEqual(max);
            }
          });
        });
      });
    });
  });
});

describe('stackData method - data set with zeros in percentage mode', function () {
  let vis;
  let mockUiState;
  const visLibParams = {
    type: 'histogram',
    addLegend: true,
    addTooltip: true,
    mode: 'percentage',
    zeroFill: true,
  };

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
  });

  beforeEach(() => {
    vis = getVis(visLibParams);
    mockUiState = getMockUiState();
    vis.on('brush', _.noop);
  });

  afterEach(function () {
    vis.destroy();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
  });

  test('should not mutate the injected zeros', function () {
    vis.render(seriesMonthlyInterval, mockUiState);

    expect(vis.handler.charts).toHaveLength(1);
    const chart = vis.handler.charts[0];
    expect(chart.chartData.series).toHaveLength(1);
    const series = chart.chartData.series[0].values;
    // with the interval set in seriesMonthlyInterval data, the point at x=1454309600000 does not exist
    const point = _.find(series, ['x', 1454309600000]);
    expect(point).not.toBe(undefined);
    expect(point.y).toBe(0);
  });

  test('should not mutate zeros that exist in the data', function () {
    vis.render(rowsWithZeros, mockUiState);

    expect(vis.handler.charts).toHaveLength(2);
    const chart = vis.handler.charts[0];
    expect(chart.chartData.series).toHaveLength(5);
    const series = chart.chartData.series[0].values;
    const point = _.find(series, ['x', 1415826240000]);
    expect(point).not.toBe(undefined);
    expect(point.y).toBe(0);
  });
});

describe('datumWidth - split chart data set with holes', function () {
  let vis;
  let mockUiState;
  const visLibParams = {
    type: 'histogram',
    addLegend: true,
    addTooltip: true,
    mode: 'stacked',
    zeroFill: true,
  };

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
  });

  beforeEach(() => {
    vis = getVis(visLibParams);
    mockUiState = getMockUiState();
    vis.on('brush', _.noop);
    vis.render(rowsSeriesWithHoles, mockUiState);
  });

  afterEach(function () {
    vis.destroy();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
  });

  test('should not have bar widths that span multiple time bins', function () {
    expect(vis.handler.charts.length).toEqual(1);
    const chart = vis.handler.charts[0];
    const rects = $(chart.chartEl).find('.series rect');
    const MAX_WIDTH_IN_PIXELS = 27;
    rects.each(function () {
      const width = parseInt($(this).attr('width'), 10);
      expect(width).toBeLessThan(MAX_WIDTH_IN_PIXELS);
    });
  });
});

describe('datumWidth - monthly interval', function () {
  let vis;
  let mockUiState;
  const visLibParams = {
    type: 'histogram',
    addLegend: true,
    addTooltip: true,
    mode: 'stacked',
    zeroFill: true,
  };

  let mockWidth;

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(900);
  });

  beforeEach(() => {
    vis = getVis(visLibParams);
    mockUiState = getMockUiState();
    vis.on('brush', _.noop);
    vis.render(seriesMonthlyInterval, mockUiState);
  });

  afterEach(function () {
    vis.destroy();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
    mockWidth.mockRestore();
  });

  test('should vary bar width when date histogram intervals are not equal', function () {
    expect(vis.handler.charts.length).toEqual(1);
    const chart = vis.handler.charts[0];
    const rects = $(chart.chartEl).find('.series rect');
    const januaryBarWidth = parseInt($(rects.get(0)).attr('width'), 10);
    const februaryBarWidth = parseInt($(rects.get(1)).attr('width'), 10);
    expect(februaryBarWidth).toBeLessThan(januaryBarWidth);
  });
});
