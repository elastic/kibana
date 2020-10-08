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

import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '../../../../../test_utils/public';

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

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Handler Test Suite for ' + names[i] + ' Data', function () {
    const events = ['click', 'brush'];
    let vis;

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    });

    beforeEach(() => {
      vis = getVis();
      vis.render(data, getMockUiState());
    });

    afterEach(function () {
      vis.destroy();
    });

    afterAll(() => {
      mockedHTMLElementClientSizes.mockRestore();
      mockedSVGElementGetBBox.mockRestore();
      mockedSVGElementGetComputedTextLength.mockRestore();
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
          expect(args[1]).toBe(event);
          done();
        };

        vis.emit = mockEmitter;
        vis.handler.enable('click', chart);
        chart.events.emit('click', event);
      });
    });
  });
});
