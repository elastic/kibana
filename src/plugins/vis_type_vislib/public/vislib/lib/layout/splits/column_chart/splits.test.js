/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import d3 from 'd3';
import $ from 'jquery';

import { chartSplit } from './chart_split';
import { chartTitleSplit } from './chart_title_split';
import { xAxisSplit } from './x_axis_split';
import { yAxisSplit } from './y_axis_split';

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
            min: 1408734082458,
          },
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
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count',
        },
        {
          hits: 621,
          label: '',
          ordered: {
            date: true,
            interval: 30000,
            max: 1408734982458,
            min: 1408734082458,
          },
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
          xAxisLabel: 'Date Histogram',
          yAxisLabel: 'Count',
        },
      ],
    };

    beforeEach(() => {
      el = d3.select('body').append('div').attr('class', 'visualization').datum(data);
    });

    afterEach(function () {
      el.remove();
    });

    describe('chart split function', function () {
      let fixture;

      beforeEach(function () {
        fixture = d3.select('.visualization').call(chartSplit);
      });

      afterEach(function () {
        fixture.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.chart').length).toBe(2);
      });

      it('should add the correct class name', function () {
        expect(!!$('.visWrapper__splitCharts--row').length).toBe(true);
      });
    });

    describe('chart title split function', function () {
      let visEl;
      let newEl;
      let fixture;

      beforeEach(function () {
        visEl = el.append('div').attr('class', 'visWrapper');
        visEl.append('div').attr('class', 'visAxis__splitTitles--x');
        visEl.append('div').attr('class', 'visAxis__splitTitles--y');
        visEl.select('.visAxis__splitTitles--x').call(chartTitleSplit);
        visEl.select('.visAxis__splitTitles--y').call(chartTitleSplit);

        newEl = d3.select('body').append('div').attr('class', 'visWrapper').datum({ series: [] });

        newEl.append('div').attr('class', 'visAxis__splitTitles--x');
        newEl.append('div').attr('class', 'visAxis__splitTitles--y');
        newEl.select('.visAxis__splitTitles--x').call(chartTitleSplit);
        newEl.select('.visAxis__splitTitles--y').call(chartTitleSplit);

        fixture = newEl.selectAll(this.childNodes)[0].length;
      });

      afterEach(function () {
        newEl.remove();
      });

      it('should append the correct number of divs', function () {
        expect($('.chart-title').length).toBe(2);
      });

      it('should remove the correct div', function () {
        expect($('.visAxis__splitTitles--y').length).toBe(1);
        expect($('.visAxis__splitTitles--x').length).toBe(0);
      });

      it('should remove all chart title divs when only one chart is rendered', function () {
        expect(fixture).toBe(0);
      });
    });

    describe('x axis split function', function () {
      let fixture;
      let divs;

      beforeEach(function () {
        fixture = d3
          .select('body')
          .append('div')
          .attr('class', 'columns')
          .datum({ columns: [{}, {}] });
        d3.select('.columns').call(xAxisSplit);
        divs = d3.selectAll('.x-axis-div')[0];
      });

      afterEach(function () {
        fixture.remove();
        $(divs).remove();
      });

      it('should append the correct number of divs', function () {
        expect(divs.length).toBe(2);
      });
    });

    describe('y axis split function', function () {
      let fixture;
      let divs;

      beforeEach(function () {
        fixture = d3
          .select('body')
          .append('div')
          .attr('class', 'rows')
          .datum({ rows: [{}, {}] });

        d3.select('.rows').call(yAxisSplit);

        divs = d3.selectAll('.y-axis-div')[0];
      });

      afterEach(function () {
        fixture.remove();
        $(divs).remove();
      });

      it('should append the correct number of divs', function () {
        expect(divs.length).toBe(2);
      });
    });
  });
});
