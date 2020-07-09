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

import _ from 'lodash';
import $ from 'jquery';
import {
  setHTMLElementClientSizes,
  setSVGElementGetBBox,
  setSVGElementGetComputedTextLength,
} from '../../../../test_utils/public';
import series from '../fixtures/mock_data/date_histogram/_series';
import columns from '../fixtures/mock_data/date_histogram/_columns';
import rows from '../fixtures/mock_data/date_histogram/_rows';
import stackedSeries from '../fixtures/mock_data/date_histogram/_stacked_series';
import { getMockUiState } from '../fixtures/mocks';
import { getVis } from './visualizations/_vis_fixture';

const dataArray = [series, columns, rows, stackedSeries];
const names = ['series', 'columns', 'rows', 'stackedSeries'];

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;

dataArray.forEach(function (data, i) {
  describe('Vislib Vis Test Suite for ' + names[i] + ' Data', function () {
    const beforeEvent = 'click';
    const afterEvent = 'brush';
    let vis;
    let mockUiState;
    let secondVis;
    let numberOfCharts;

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
    });

    beforeEach(() => {
      vis = getVis();
      secondVis = getVis();
      mockUiState = getMockUiState();
    });

    afterEach(function () {
      vis.destroy();
      secondVis.destroy();
    });

    afterAll(() => {
      mockedHTMLElementClientSizes.mockRestore();
      mockedSVGElementGetBBox.mockRestore();
      mockedSVGElementGetComputedTextLength.mockRestore();
    });

    describe('render Method', function () {
      beforeEach(function () {
        vis.render(data, mockUiState);
        numberOfCharts = vis.handler.charts.length;
      });

      test('should bind data to this object', function () {
        expect(_.isObject(vis.data)).toBe(true);
      });

      test('should instantiate a handler object', function () {
        expect(_.isObject(vis.handler)).toBe(true);
      });

      test('should append a chart', function () {
        expect($('.chart').length).toBe(numberOfCharts);
      });

      test('should throw an error if no data is provided', function () {
        expect(function () {
          vis.render(null, mockUiState);
        }).toThrowError();
      });
    });

    describe('getLegendColors method', () => {
      test('should return null if no colors are defined', () => {
        expect(vis.getLegendColors()).toEqual(null);
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.render(data, mockUiState);
        secondVis.render(data, mockUiState);
        secondVis.destroy();
      });

      test('should remove all DOM elements from el', function () {
        expect($(secondVis.el).find('.visWrapper').length).toBe(0);
      });

      test('should not remove visualizations that have not been destroyed', function () {
        expect($(vis.element).find('.visWrapper').length).toBe(1);
      });
    });

    describe('set Method', function () {
      beforeEach(function () {
        vis.render(data, mockUiState);
        vis.set('addLegend', false);
        vis.set('offset', 'wiggle');
      });

      test('should set an attribute', function () {
        expect(vis.get('addLegend')).toBe(false);
        expect(vis.get('offset')).toBe('wiggle');
      });
    });

    describe('get Method', function () {
      beforeEach(function () {
        vis.render(data, mockUiState);
      });

      test('should get attribute values', function () {
        expect(vis.get('addLegend')).toBe(true);
        expect(vis.get('addTooltip')).toBe(true);
        expect(vis.get('type')).toBe('point_series');
      });
    });

    describe('on Method', function () {
      let listeners;

      beforeEach(function () {
        listeners = [function () {}, function () {}];

        // Add event and listeners to chart
        listeners.forEach(function (listener) {
          vis.on(beforeEvent, listener);
        });

        // Render chart
        vis.render(data, mockUiState);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });
      });

      afterEach(function () {
        vis.removeAllListeners(beforeEvent);
        vis.removeAllListeners(afterEvent);
      });

      test('should add an event and its listeners', function () {
        listeners.forEach(function (listener) {
          expect(vis.listeners(beforeEvent)).toContain(listener);
        });

        listeners.forEach(function (listener) {
          expect(vis.listeners(afterEvent)).toContain(listener);
        });
      });

      test('should cause a listener for each event to be attached to each chart', function () {
        const charts = vis.handler.charts;

        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).toBeGreaterThan(0);
          expect(chart.events.listenerCount(afterEvent)).toBeGreaterThan(0);
        });
      });
    });

    describe('off Method', function () {
      let listeners;
      let listener1;
      let listener2;

      beforeEach(function () {
        listeners = [];
        listener1 = function () {};
        listener2 = function () {};
        listeners.push(listener1);
        listeners.push(listener2);

        // Add event and listeners to chart
        listeners.forEach(function (listener) {
          vis.on(beforeEvent, listener);
        });

        // Turn off event listener before chart rendered
        vis.off(beforeEvent, listener1);

        // Render chart
        vis.render(data, mockUiState);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });

        // Turn off event listener after chart is rendered
        vis.off(afterEvent, listener1);
      });

      afterEach(function () {
        vis.removeAllListeners(beforeEvent);
        vis.removeAllListeners(afterEvent);
      });

      test('should remove a listener', function () {
        const charts = vis.handler.charts;

        expect(vis.listeners(beforeEvent)).not.toContain(listener1);
        expect(vis.listeners(beforeEvent)).toContain(listener2);

        expect(vis.listeners(afterEvent)).not.toContain(listener1);
        expect(vis.listeners(afterEvent)).toContain(listener2);

        // Events should still be attached to charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).toBeGreaterThan(0);
          expect(chart.events.listenerCount(afterEvent)).toBeGreaterThan(0);
        });
      });

      test('should remove the event and all listeners when only event passed an argument', function () {
        const charts = vis.handler.charts;
        vis.removeAllListeners(afterEvent);

        // should remove 'brush' event
        expect(vis.listeners(beforeEvent)).toContain(listener2);
        expect(vis.listeners(afterEvent)).not.toContain(listener2);

        // should remove the event from the charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).toBeGreaterThan(0);
          expect(chart.events.listenerCount(afterEvent)).toBe(0);
        });
      });

      test('should remove the event from the chart when the last listener is removed', function () {
        const charts = vis.handler.charts;
        vis.off(afterEvent, listener2);

        expect(vis.listenerCount(afterEvent)).toBe(0);

        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(afterEvent)).toBe(0);
        });
      });
    });
  });
});
