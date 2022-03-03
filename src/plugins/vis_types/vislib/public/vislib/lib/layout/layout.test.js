/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '@kbn/test-jest-helpers';

// Data
import series from '../../../fixtures/mock_data/date_histogram/_series';
import columns from '../../../fixtures/mock_data/date_histogram/_columns';
import rows from '../../../fixtures/mock_data/date_histogram/_rows';
import stackedSeries from '../../../fixtures/mock_data/date_histogram/_stacked_series';
import { getMockUiState } from '../../../fixtures/mocks';
import { Layout } from './layout';
import { VisConfig } from '../vis_config';
import { getVis } from '../../visualizations/_vis_fixture';

const dateHistogramArray = [series, columns, rows, stackedSeries];
const names = ['series', 'columns', 'rows', 'stackedSeries'];

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;
let mockWidth;

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Layout Class Test Suite for ' + names[i] + ' Data', function () {
    let vis;
    let mockUiState;
    let numberOfCharts;
    let testLayout;

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
      mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(900);
    });

    beforeEach(() => {
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
      const config = _.defaultsDeep({}, vislibParams);
      vis = getVis(config);
      mockUiState = getMockUiState();
      vis.render(data, mockUiState);
      numberOfCharts = vis.handler.charts.length;
    });

    afterEach(() => {
      vis.destroy();
    });

    afterAll(() => {
      mockedHTMLElementClientSizes.mockRestore();
      mockedSVGElementGetBBox.mockRestore();
      mockedSVGElementGetComputedTextLength.mockRestore();
      mockWidth.mockRestore();
    });

    describe('createLayout Method', function () {
      test('should append all the divs', function () {
        expect($(vis.element).find('.visWrapper').length).toBe(1);
        expect($(vis.element).find('.visAxis--y').length).toBe(2);
        expect($(vis.element).find('.visWrapper__column').length).toBe(1);
        expect($(vis.element).find('.visAxis__column--y').length).toBe(2);
        expect($(vis.element).find('.y-axis-title').length).toBeGreaterThan(0);
        expect($(vis.element).find('.visAxis__splitAxes--y').length).toBe(2);
        expect($(vis.element).find('.visAxis__spacer--y').length).toBe(4);
        expect($(vis.element).find('.visWrapper__chart').length).toBe(numberOfCharts);
        expect($(vis.element).find('.visAxis--x').length).toBe(2);
        expect($(vis.element).find('.visAxis__splitAxes--x').length).toBe(2);
        expect($(vis.element).find('.x-axis-title').length).toBeGreaterThan(0);
      });
    });

    describe('layout Method', function () {
      beforeEach(function () {
        const visConfig = new VisConfig(
          {
            type: 'heatmap',
          },
          data,
          mockUiState,
          vis.element,
          () => undefined
        );
        testLayout = new Layout(visConfig);
      });

      test('should append a div with the correct class name', function () {
        expect($(vis.element).find('.chart').length).toBe(numberOfCharts);
      });

      test('should bind data to the DOM element', function () {
        expect(!!$(vis.element).find('.chart').data()).toBe(true);
      });

      test('should create children', function () {
        expect(typeof $(vis.element).find('.x-axis-div')).toBe('object');
      });

      test('should call split function when provided', function () {
        expect(typeof $(vis.element).find('.x-axis-div')).toBe('object');
      });

      test('should throw errors when incorrect arguments provided', function () {
        expect(function () {
          testLayout.layout({
            parent: vis.element,
            type: undefined,
            class: 'chart',
          });
        }).toThrowError();

        expect(function () {
          testLayout.layout({
            type: 'div',
            class: 'chart',
          });
        }).toThrowError();

        expect(function () {
          testLayout.layout({
            parent: 'heatmap',
            type: 'div',
          });
        }).toThrowError();

        expect(function () {
          testLayout.layout({
            parent: vis.element,
            type: function (d) {
              return d;
            },
            class: 'chart',
          });
        }).toThrowError();
      });
    });

    describe('appendElem Method', function () {
      beforeEach(function () {
        vis.handler.layout.appendElem(vis.element, 'svg', 'column');
        vis.handler.layout.appendElem('.visChart', 'div', 'test');
      });

      test('should append DOM element to el with a class name', function () {
        expect(typeof $(vis.element).find('.column')).toBe('object');
        expect(typeof $(vis.element).find('.test')).toBe('object');
      });
    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        d3.select(vis.element).append('div').attr('class', 'visualize');
        vis.handler.layout.removeAll(vis.element);
      });

      test('should remove all DOM elements from the el', function () {
        expect($(vis.element).children().length).toBe(0);
      });
    });
  });
});
