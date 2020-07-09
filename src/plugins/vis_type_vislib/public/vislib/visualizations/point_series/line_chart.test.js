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
import $ from 'jquery';
import _ from 'lodash';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '../../../../../../test_utils/public';

// Data
import seriesPos from '../../../fixtures/mock_data/date_histogram/_series';
import seriesPosNeg from '../../../fixtures/mock_data/date_histogram/_series_pos_neg';
import seriesNeg from '../../../fixtures/mock_data/date_histogram/_series_neg';
import histogramColumns from '../../../fixtures/mock_data/histogram/_columns';
import rangeRows from '../../../fixtures/mock_data/range/_rows';
import termSeries from '../../../fixtures/mock_data/terms/_series';
import { getMockUiState } from '../../../fixtures/mocks';
import { getVis } from '../_vis_fixture';

const dataTypes = [
  ['series pos', seriesPos],
  ['series pos neg', seriesPosNeg],
  ['series neg', seriesNeg],
  ['histogram columns', histogramColumns],
  ['range rows', rangeRows],
  ['term series', termSeries],
];

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;

describe('Vislib Line Chart', function () {
  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
  });

  dataTypes.forEach(function (type) {
    const name = type[0];
    const data = type[1];

    describe(name + ' Data', function () {
      let vis;
      let mockUiState;

      beforeEach(() => {
        const visLibParams = {
          type: 'line',
          addLegend: true,
          addTooltip: true,
          drawLinesBetweenPoints: true,
        };

        vis = getVis(visLibParams);
        mockUiState = getMockUiState();
        vis.render(data, mockUiState);
        vis.on('brush', _.noop);
      });

      afterEach(function () {
        vis.destroy();
      });

      describe('addCircleEvents method', function () {
        let circle;
        let brush;
        let d3selectedCircle;
        let onBrush;
        let onClick;
        let onMouseOver;

        beforeEach(function () {
          vis.handler.charts.forEach(function (chart) {
            circle = $(chart.chartEl).find('.circle')[0];
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
      });

      describe('addLines method', function () {
        test('should append a paths', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('path').length).toBeGreaterThan(0);
          });
        });
      });

      // Cannot seem to get these tests to work on the box
      // They however pass in the browsers
      //describe('addClipPath method', function () {
      //  test('should append a clipPath', function () {
      //    vis.handler.charts.forEach(function (chart) {
      //      expect($(chart.chartEl).find('clipPath').length).to.be(1);
      //    });
      //  });
      //});

      describe('draw method', function () {
        test('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.draw()).toBeInstanceOf(Function);
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
});
