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
import expect from '@kbn/expect';

import { getMockUiState } from '../../../../../../../plugins/vis_type_vislib/public/fixtures/mocks';
import { getVis } from '../_vis_fixture';
import { pieChartMockData } from './pie_chart_mock_data';

const names = ['rows', 'columns', 'slices'];

const sizes = [0, 5, 15, 30, 60, 120];

describe('No global chart settings', function() {
  const visLibParams1 = {
    el: '<div class=chart1></div>',
    type: 'pie',
    addLegend: true,
    addTooltip: true,
  };
  let chart1;
  let mockUiState;

  beforeEach(() => {
    chart1 = getVis(visLibParams1);
    mockUiState = getMockUiState();
  });

  beforeEach(async () => {
    chart1.render(pieChartMockData.rowData, mockUiState);
  });

  afterEach(function() {
    chart1.destroy();
  });

  it('should render chart titles for all charts', function() {
    expect($(chart1.element).find('.visAxis__splitTitles--y').length).to.be(1);
  });

  describe('_validatePieData method', function() {
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

    it('should throw an error when all charts contain zeros', function() {
      expect(function() {
        chart1.handler.ChartClass.prototype._validatePieData(allZeros);
      }).to.throwError();
    });

    it('should not throw an error when only some or no charts contain zeros', function() {
      expect(function() {
        chart1.handler.ChartClass.prototype._validatePieData(someZeros);
      }).to.not.throwError();
      expect(function() {
        chart1.handler.ChartClass.prototype._validatePieData(noZeros);
      }).to.not.throwError();
    });
  });
});

describe('Vislib PieChart Class Test Suite', function() {
  ['rowData', 'columnData', 'sliceData'].forEach(function(aggItem, i) {
    describe('Vislib PieChart Class Test Suite for ' + names[i] + ' data', function() {
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

      afterEach(function() {
        vis.destroy();
      });

      describe('addPathEvents method', function() {
        let path;
        let d3selectedPath;
        let onClick;
        let onMouseOver;

        beforeEach(function() {
          vis.handler.charts.forEach(function(chart) {
            path = $(chart.chartEl).find('path')[0];
            d3selectedPath = d3.select(path)[0][0];

            // d3 instance of click and hover
            onClick = !!d3selectedPath.__onclick;
            onMouseOver = !!d3selectedPath.__onmouseover;
          });
        });

        it('should attach a click event', function() {
          vis.handler.charts.forEach(function() {
            expect(onClick).to.be(true);
          });
        });

        it('should attach a hover event', function() {
          vis.handler.charts.forEach(function() {
            expect(onMouseOver).to.be(true);
          });
        });
      });

      describe('addPath method', function() {
        let width;
        let height;
        let svg;
        let slices;

        it('should return an SVG object', function() {
          vis.handler.charts.forEach(function(chart) {
            $(chart.chartEl)
              .find('svg')
              .empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            expect(_.isObject(chart.addPath(width, height, svg, slices))).to.be(true);
          });
        });

        it('should draw path elements', function() {
          vis.handler.charts.forEach(function(chart) {
            // test whether path elements are drawn
            expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
          });
        });

        it('should draw labels', function() {
          vis.handler.charts.forEach(function(chart) {
            $(chart.chartEl)
              .find('svg')
              .empty();
            width = $(chart.chartEl).width();
            height = $(chart.chartEl).height();
            svg = d3.select($(chart.chartEl).find('svg')[0]);
            slices = chart.chartData.slices;
            chart._attr.labels.show = true;
            chart.addPath(width, height, svg, slices);
            expect($(chart.chartEl).find('text.label-text').length).to.be.greaterThan(0);
          });
        });
      });

      describe('draw method', function() {
        it('should return a function', function() {
          vis.handler.charts.forEach(function(chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });
      });

      sizes.forEach(function(size) {
        describe('containerTooSmall error', function() {
          it('should throw an error', function() {
            // 20px is the minimum height and width
            vis.handler.charts.forEach(function(chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size < 20) {
                expect(function() {
                  chart.render();
                }).to.throwError();
              }
            });
          });

          it('should not throw an error', function() {
            vis.handler.charts.forEach(function(chart) {
              $(chart.chartEl).height(size);
              $(chart.chartEl).width(size);

              if (size > 20) {
                expect(function() {
                  chart.render();
                }).to.not.throwError();
              }
            });
          });
        });
      });
    });
  });
});
