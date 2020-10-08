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
} from '../../../../../test_utils/public';
import { getMockUiState } from '../../fixtures/mocks';
import { getVis } from './_vis_fixture';
import { pieChartMockData } from './pie_chart_mock_data';

const names = ['rows', 'columns', 'slices'];

const sizes = [0, 5, 15, 30, 60, 120];

let mockedHTMLElementClientSizes = {};
let mockWidth;
let mockHeight;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;

describe('No global chart settings', function () {
  const visLibParams1 = {
    el: '<div class=chart1></div>',
    type: 'pie',
    addLegend: true,
    addTooltip: true,
  };
  let chart1;
  let mockUiState;

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(120);
    mockHeight = jest.spyOn($.prototype, 'height').mockReturnValue(120);
  });

  beforeEach(() => {
    chart1 = getVis(visLibParams1);
    mockUiState = getMockUiState();
  });

  beforeEach(async () => {
    chart1.render(pieChartMockData.rowData, mockUiState);
  });

  afterEach(function () {
    chart1.destroy();
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
    mockWidth.mockRestore();
    mockHeight.mockRestore();
  });

  test('should render chart titles for all charts', function () {
    expect($(chart1.element).find('.visAxis__splitTitles--y').length).toBe(1);
  });

  describe('_validatePieData method', function () {
    const allZeros = [
      { slices: { children: [] } },
      { slices: { children: [] } },
      { slices: { children: [] } },
    ];

    const someZeros = [
      { slices: { children: [{}] } },
      { slices: { children: [{}] } },
      { slices: { children: [] } },
    ];

    const noZeros = [
      { slices: { children: [{}] } },
      { slices: { children: [{}] } },
      { slices: { children: [{}] } },
    ];

    test('should throw an error when all charts contain zeros', function () {
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(allZeros);
      }).toThrowError();
    });

    test('should not throw an error when only some or no charts contain zeros', function () {
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(someZeros);
      }).not.toThrowError();
      expect(function () {
        chart1.handler.ChartClass.prototype._validatePieData(noZeros);
      }).not.toThrowError();
    });
  });
});

describe('Vislib PieChart Class Test Suite', function () {
  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    let width = 120;
    let height = 120;
    const mockWidth = jest.spyOn($.prototype, 'width');
    mockWidth.mockImplementation((size) => {
      if (size === undefined) {
        return width;
      }
      width = size;
    });
    const mockHeight = jest.spyOn($.prototype, 'height');
    mockHeight.mockImplementation((size) => {
      if (size === undefined) {
        return height;
      }
      height = size;
    });
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
    mockWidth.mockRestore();
    mockHeight.mockRestore();
  });

  ['rowData', 'columnData', 'sliceData'].forEach(function (aggItem, i) {
    describe('Vislib PieChart Class Test Suite for ' + names[i] + ' data', function () {
      const mockPieData = pieChartMockData[aggItem];

      const visLibParams = {
        type: 'pie',
        addLegend: true,
        addTooltip: true,
      };
      let vis;

      beforeEach(async () => {
        vis = getVis(visLibParams);
        const mockUiState = getMockUiState();
        vis.render(mockPieData, mockUiState);
      });

      afterEach(function () {
        vis.destroy();
      });

      describe('addPathEvents method', function () {
        let path;
        let d3selectedPath;
        let onClick;
        let onMouseOver;

        beforeEach(function () {
          vis.handler.charts.forEach(function (chart) {
            path = $(chart.chartEl).find('path')[0];
            d3selectedPath = d3.select(path)[0][0];

            // d3 instance of click and hover
            onClick = !!d3selectedPath.__onclick;
            onMouseOver = !!d3selectedPath.__onmouseover;
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

      describe('addPath method', function () {
        let width;
        let height;
        let svg;
        let slices;

        test('should return an SVG object', function () {
          vis.handler.charts.forEach(function (chart) {
            $(chart.chartEl).find('svg').empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            expect(_.isObject(chart.addPath(width, height, svg, slices))).toBe(true);
          });
        });

        test('should draw path elements', function () {
          vis.handler.charts.forEach(function (chart) {
            // test whether path elements are drawn
            expect($(chart.chartEl).find('path').length).toBeGreaterThan(0);
          });
        });

        test('should draw labels', function () {
          vis.handler.charts.forEach(function (chart) {
            $(chart.chartEl).find('svg').empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            chart._attr.labels.show = true;
            chart.addPath(width, height, svg, slices);
            expect($(chart.chartEl).find('text.label-text').length).toBeGreaterThan(0);
          });
        });
      });

      describe('draw method', function () {
        test('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).toBe(true);
          });
        });
      });

      sizes.forEach(function (size) {
        describe('containerTooSmall error', function () {
          test('should throw an error', function () {
            // 20px is the minimum height and width
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size < 20) {
                expect(function () {
                  chart.render();
                }).toThrowError();
              }
            });
          });

          test('should not throw an error', function () {
            vis.handler.charts.forEach(function (chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size > 20) {
                expect(function () {
                  chart.render();
                }).not.toThrowError();
              }
            });
          });
        });
      });
    });
  });
});
