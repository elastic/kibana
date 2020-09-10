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

import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '../../../../../../test_utils/public';

import { getMockUiState } from '../../../fixtures/mocks';
import { getVis } from '../_vis_fixture';

const dataTypesArray = {
  'series pos': import('../../../fixtures/mock_data/date_histogram/_series'),
  'series pos neg': import('../../../fixtures/mock_data/date_histogram/_series_pos_neg'),
  'series neg': import('../../../fixtures/mock_data/date_histogram/_series_neg'),
  'term columns': import('../../../fixtures/mock_data/terms/_columns'),
  'range rows': import('../../../fixtures/mock_data/range/_rows'),
  stackedSeries: import('../../../fixtures/mock_data/date_histogram/_stacked_series'),
};

const visLibParams = {
  type: 'area',
  addLegend: true,
  addTooltip: true,
  mode: 'stacked',
};

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;

_.forOwn(dataTypesArray, function (dataType, dataTypeName) {
  describe('Vislib Area Chart Test Suite for ' + dataTypeName + ' Data', function () {
    let vis;
    let mockUiState;

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    });

    beforeEach(async () => {
      vis = getVis(visLibParams);
      mockUiState = getMockUiState();
      vis.on('brush', _.noop);
      vis.render(await dataType, mockUiState);
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

      test('should append a d.y0 key to the data object', function () {
        expect(isStacked).toBe(true);
      });
    });

    describe('addPath method', function () {
      test('should append a area paths', function () {
        vis.handler.charts.forEach(function (chart) {
          expect($(chart.chartEl).find('path').length).toBeGreaterThan(0);
        });
      });
    });

    describe('addPathEvents method', function () {
      let path;
      let d3selectedPath;
      let onMouseOver;

      beforeEach(function () {
        vis.handler.charts.forEach(function (chart) {
          path = $(chart.chartEl).find('path')[0];
          d3selectedPath = d3.select(path)[0][0];

          // d3 instance of click and hover
          onMouseOver = !!d3selectedPath.__onmouseover;
        });
      });

      test('should attach a hover event', function () {
        vis.handler.charts.forEach(function () {
          expect(onMouseOver).toBe(true);
        });
      });
    });

    describe('addCircleEvents method', function () {
      let circle;
      let brush;
      let d3selectedCircle;
      let onBrush;
      let onClick;
      let onMouseOver;

      beforeEach(() => {
        vis.handler.charts.forEach(function (chart) {
          circle = $(chart.chartEl).find('circle')[0];
          brush = $(chart.chartEl).find('.brush');
          d3selectedCircle = d3.select(circle)[0][0];

          // d3 instance of click and hover
          onBrush = !!brush;
          onClick = !!d3selectedCircle.__onclick;
          onMouseOver = !!d3selectedCircle.__onmouseover;
        });
      });

      // D3 brushing requires that a g element is appended that
      // listens for mousedown events. This g element includes
      // listeners, however, I was not able to test for the listener
      // function being present. I will need to update this test
      // in the future.
      test('should attach a brush g element', function () {
        vis.handler.charts.forEach(function () {
          expect(onBrush).toBe(true);
        });
      });

      test('should attach a click event', function () {
        vis.handler.charts.forEach(function () {
          expect(onClick).toBe(true);
        });
      });

      test('should attach a hover event', function () {
        vis.handler.charts.forEach(function () {
          expect(onMouseOver).toBe(true);
        });
      });
    });

    describe('addCircles method', function () {
      test('should append circles', function () {
        vis.handler.charts.forEach(function (chart) {
          expect($(chart.chartEl).find('circle').length).toBeGreaterThan(0);
        });
      });

      test('should not draw circles where d.y === 0', function () {
        vis.handler.charts.forEach(function (chart) {
          const series = chart.chartData.series;
          const isZero = series.some(function (d) {
            return d.y === 0;
          });
          const circles = $.makeArray($(chart.chartEl).find('circle'));
          const isNotDrawn = circles.some(function (d) {
            return d.__data__.y === 0;
          });

          if (isZero) {
            expect(isNotDrawn).toBe(false);
          }
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
      beforeEach(async function () {
        vis.visConfigArgs.defaultYExtents = true;
        vis.render(await dataType, mockUiState);
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
        beforeEach(async function () {
          vis.visConfigArgs.defaultYExtents = true;
          vis.visConfigArgs.boundsMargin = boundsMarginValue;
          vis.render(await dataType, mockUiState);
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
