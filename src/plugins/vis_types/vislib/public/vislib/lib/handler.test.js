/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import _ from 'lodash';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '@kbn/test-jest-helpers';

// Data
import series from '../../fixtures/mock_data/date_histogram/_series';
import columns from '../../fixtures/mock_data/date_histogram/_columns';
import rows from '../../fixtures/mock_data/date_histogram/_rows';
import stackedSeries from '../../fixtures/mock_data/date_histogram/_stacked_series';
import { getMockUiState } from '../../fixtures/mocks';
import { getVis } from '../visualizations/_vis_fixture';

const dateHistogramArray = [series, columns, rows, stackedSeries];
const names = ['series', 'columns', 'rows', 'stackedSeries'];
let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;
let mockWidth;

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Handler Test Suite for ' + names[i] + ' Data', function () {
    const events = ['click', 'brush'];
    let vis;

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
      vis.render(data, getMockUiState());
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

    describe('render Method', function () {
      test('should render charts', function () {
        expect(vis.handler.charts.length).toBeGreaterThan(0);
        vis.handler.charts.forEach(function (chart) {
          expect($(chart.chartEl).find('svg').length).toBe(1);
        });
      });
    });

    describe('enable Method', function () {
      let charts;

      beforeEach(function () {
        charts = vis.handler.charts;

        charts.forEach(function (chart) {
          events.forEach(function (event) {
            vis.handler.enable(event, chart);
          });
        });
      });

      test('should add events to chart and emit to the Events class', function () {
        charts.forEach(function (chart) {
          events.forEach(function (event) {
            expect(chart.events.listenerCount(event)).toBeGreaterThan(0);
          });
        });
      });
    });

    describe('disable Method', function () {
      let charts;

      beforeEach(function () {
        charts = vis.handler.charts;

        charts.forEach(function (chart) {
          events.forEach(function (event) {
            vis.handler.disable(event, chart);
          });
        });
      });

      test('should remove events from the chart', function () {
        charts.forEach(function (chart) {
          events.forEach(function (event) {
            expect(chart.events.listenerCount(event)).toBe(0);
          });
        });
      });
    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        vis.handler.removeAll(vis.element);
      });

      test('should remove all DOM elements from the el', function () {
        expect($(vis.element).children().length).toBe(0);
      });
    });

    describe('error Method', function () {
      beforeEach(function () {
        vis.handler.error('This is an error!');
      });

      test('should return an error classed DOM element with a text message', function () {
        expect($(vis.element).find('.error').length).toBe(1);
        expect($('.error h4').html()).toBe('This is an error!');
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.handler.destroy();
      });

      test('should destroy all the charts in the visualization', function () {
        expect(vis.handler.charts.length).toBe(0);
      });
    });

    describe('event proxying', function () {
      test('should only pass the original event object to downstream handlers', function (done) {
        const event = {};
        const chart = vis.handler.charts[0];

        const mockEmitter = function () {
          const args = Array.from(arguments);
          expect(args.length).toBe(2);
          expect(args[0]).toBe('click');
          expect(args[1].data).toBe(event);
          done();
        };

        vis.emit = mockEmitter;
        vis.handler.enable('click', chart);
        chart.events.emit('click', event);
      });
    });
  });
});
