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
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import $ from 'jquery';
import { chartSplit } from '../../../../../lib/layout/splits/column_chart/chart_split';
import { chartTitleSplit } from '../../../../../lib/layout/splits/column_chart/chart_title_split';
import { xAxisSplit } from '../../../../../lib/layout/splits/column_chart/x_axis_split';
import { yAxisSplit } from '../../../../../lib/layout/splits/column_chart/y_axis_split';

describe('Vislib Split Function Test Suite', function () {
  describe('Column Chart', function () {
    let el;
    const data = {
      rows: [
        {
          hits: 621,
          label: '',
          ordered: {
            date: true,
            interval: 30000,
            max: 1408734982458,
            min: 1408734082458
          },
          series: [
            {
              values: [
                {
                  x: 1408734060000,
                  y: 8
                },
                {
                  x: 1408734090000,
                  y: 23
                },
                {
                  x: 1408734120000,
                  y: 30
                },
                {
                  x: 1408734150000,
                  y: 28
                },
                {
                  x: 1408734180000,
                  y: 36
                },
                {
                  x: 1408734210000,
                  y: 30
                },
                {
                  x: 1408734240000,
                  y: 26
                },
                {
                  x: 1408734270000,
                  y: 22
                },
                {
                  x: 1408734300000,
                  y: 29
                },
                {
                  x: 1408734330000,
                  y: 24
                }
              ]
            }
          ],
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count'
        },
        {
          hits: 621,
          label: '',
          ordered: {
            date: true,
            interval: 30000,
            max: 1408734982458,
            min: 1408734082458
          },
          series: [
            {
              values: [
                {
                  x: 1408734060000,
                  y: 8
                },
                {
                  x: 1408734090000,
                  y: 23
                },
                {
                  x: 1408734120000,
                  y: 30
                },
                {
                  x: 1408734150000,
                  y: 28
                },
                {
                  x: 1408734180000,
                  y: 36
                },
                {
                  x: 1408734210000,
                  y: 30
                },
                {
                  x: 1408734240000,
                  y: 26
                },
                {
                  x: 1408734270000,
                  y: 22
                },
                {
                  x: 1408734300000,
                  y: 29
                },
                {
                  x: 1408734330000,
                  y: 24
                }
              ]
            }
          ],
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count'
        }
      ]
    };

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function () {
      el = d3.select('body').append('div')
        .attr('class', 'visualization')
        .datum(data);
    }));

    afterEach(function () {
      el.remove();
    });

    describe('chart split function', function () {
      let fixture;

      beforeEach(ngMock.inject(function () {
        fixture = d3.select('.visualization').call(chartSplit);
      }));

      afterEach(function () {
        fixture.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.chart').length).to.be(2);
      });

      it('should add the correct class name', function () {
        expect(!!$('.visWrapper__splitCharts--row').length).to.be(true);
      });
    });

    describe('chart title split function', function () {
      let visEl;
      let newEl;
      let fixture;

      beforeEach(ngMock.inject(function () {
        visEl = el.append('div').attr('class', 'visWrapper');
        visEl.append('div').attr('class', 'visAxis__splitTitles--x');
        visEl.append('div').attr('class', 'visAxis__splitTitles--y');
        visEl.select('.visAxis__splitTitles--x').call(chartTitleSplit);
        visEl.select('.visAxis__splitTitles--y').call(chartTitleSplit);

        newEl = d3.select('body').append('div')
          .attr('class', 'visWrapper')
          .datum({ series: [] });

        newEl.append('div').attr('class', 'visAxis__splitTitles--x');
        newEl.append('div').attr('class', 'visAxis__splitTitles--y');
        newEl.select('.visAxis__splitTitles--x').call(chartTitleSplit);
        newEl.select('.visAxis__splitTitles--y').call(chartTitleSplit);

        fixture = newEl.selectAll(this.childNodes)[0].length;
      }));

      afterEach(function () {
        newEl.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.chart-title').length).to.be(2);
      });

      it('should remove the correct div', function () {
        expect($('.visAxis__splitTitles--y').length).to.be(1);
        expect($('.visAxis__splitTitles--x').length).to.be(0);
      });

      it('should remove all chart title divs when only one chart is rendered', function () {
        expect(fixture).to.be(0);
      });
    });

    describe('x axis split function', function () {
      let fixture;
      let divs;

      beforeEach(ngMock.inject(function () {
        fixture = d3.select('body').append('div')
          .attr('class', 'columns')
          .datum({ columns: [{}, {}] });
        d3.select('.columns').call(xAxisSplit);
        divs = d3.selectAll('.x-axis-div')[0];
      }));

      afterEach(function () {
        fixture.remove();
        $(divs).remove();
      });

      it('should append the correct number of divs', function () {
        expect(divs.length).to.be(2);
      });
    });

    describe('y axis split function', function () {
      let fixture;
      let divs;

      beforeEach(ngMock.inject(function () {
        fixture = d3.select('body').append('div')
          .attr('class', 'rows')
          .datum({ rows: [{}, {}] });

        d3.select('.rows').call(yAxisSplit);

        divs = d3.selectAll('.y-axis-div')[0];
      }));

      afterEach(function () {
        fixture.remove();
        $(divs).remove();
      });

      it('should append the correct number of divs', function () {
        expect(divs.length).to.be(2);
      });
    });

  });
});
