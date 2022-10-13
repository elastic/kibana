/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import $ from 'jquery';
import d3 from 'd3';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '@kbn/test-jest-helpers';

// Data
import series from '../../../fixtures/mock_data/date_histogram/_series';
import seriesPosNeg from '../../../fixtures/mock_data/date_histogram/_series_pos_neg';
import seriesNeg from '../../../fixtures/mock_data/date_histogram/_series_neg';
import termsColumns from '../../../fixtures/mock_data/terms/_columns';
import stackedSeries from '../../../fixtures/mock_data/date_histogram/_stacked_series';
import { getMockUiState } from '../../../fixtures/mocks';
import { getVis } from '../_vis_fixture';

// tuple, with the format [description, mode, data]
const dataTypesArray = [
  ['series', series],
  ['series with positive and negative values', seriesPosNeg],
  ['series with negative values', seriesNeg],
  ['terms columns', termsColumns],
  ['stackedSeries', stackedSeries],
];

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;
let mockWidth;

describe('Vislib Heatmap Chart Test Suite', function () {
  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
    mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(900);
  });

  afterAll(() => {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
    mockedSVGElementGetComputedTextLength.mockRestore();
    mockWidth.mockRestore();
  });

  dataTypesArray.forEach(function (dataType) {
    const name = dataType[0];
    const data = dataType[1];

    describe('for ' + name + ' Data', function () {
      let vis;
      let mockUiState;
      const vislibParams = {
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

      function generateVis(opts = {}) {
        const config = _.defaultsDeep({}, opts, vislibParams);
        vis = getVis(config);
        mockUiState = getMockUiState();
        vis.on('brush', _.noop);
        vis.render(data, mockUiState);
      }

      beforeEach(() => {
        generateVis();
      });

      afterEach(function () {
        vis.destroy();
      });

      test('category axes should be rendered in reverse order', () => {
        const renderedCategoryAxes = vis.handler.renderArray.filter((item) => {
          return (
            item.constructor &&
            item.constructor.name === 'Axis' &&
            item.axisConfig.get('type') === 'category'
          );
        });
        expect(vis.handler.categoryAxes.length).toEqual(renderedCategoryAxes.length);
        expect(vis.handler.categoryAxes[0].axisConfig.get('id')).toEqual(
          renderedCategoryAxes[1].axisConfig.get('id')
        );
        expect(vis.handler.categoryAxes[1].axisConfig.get('id')).toEqual(
          renderedCategoryAxes[0].axisConfig.get('id')
        );
      });

      describe('addSquares method', function () {
        test('should append rects', function () {
          vis.handler.charts.forEach(function (chart) {
            const numOfRects = chart.chartData.series.reduce((result, series) => {
              return result + series.values.length;
            }, 0);
            expect($(chart.chartEl).find('.series rect')).toHaveLength(numOfRects);
          });
        });
      });

      describe('addBarEvents method', function () {
        function checkChart(chart) {
          const rect = $(chart.chartEl).find('.series rect').get(0);

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

        test('should attach the brush if data is a set of ordered dates', function () {
          vis.handler.charts.forEach(function (chart) {
            const has = checkChart(chart);
            const ordered = vis.handler.data.get('ordered');
            const date = Boolean(ordered && ordered.date);
            expect(has.brush).toBe(date);
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
      });

      test('should define default colors', function () {
        expect(mockUiState.get('vis.defaultColors')).not.toBe(undefined);
      });

      test('should set custom range', function () {
        vis.destroy();
        generateVis({
          setColorRange: true,
          colorsRange: [
            { from: 0, to: 200 },
            { from: 200, to: 400 },
            { from: 400, to: 500 },
            { from: 500, to: Infinity },
          ],
        });
        const labels = vis.getLegendLabels();
        expect(labels[0]).toBe('0 - 200');
        expect(labels[1]).toBe('200 - 400');
        expect(labels[2]).toBe('400 - 500');
        expect(labels[3]).toBe('500 - Infinity');
      });

      test('should show correct Y axis title', function () {
        expect(vis.handler.categoryAxes[1].axisConfig.get('title.text')).toEqual('');
      });
    });
  });
});
