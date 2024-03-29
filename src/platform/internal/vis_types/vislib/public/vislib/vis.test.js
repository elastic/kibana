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
let mockWidth;

dataArray.forEach(function (data, i) {
  describe('Vislib Vis Test Suite for ' + names[i] + ' Data', function () {
    const beforeEvent = 'click';
    const afterEvent = 'brush';
    let vis;
    let mockUiState;
    let secondVis;
    let numberOfCharts;
    let config;

    beforeAll(() => {
      mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
      mockedSVGElementGetBBox = setSVGElementGetBBox(100);
      mockedSVGElementGetComputedTextLength = setSVGElementGetComputedTextLength(100);
      mockWidth = jest.spyOn($.prototype, 'width').mockReturnValue(900);
    });

    beforeEach(() => {
      config = {
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
      vis = getVis(config);
      secondVis = getVis(config);
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
      mockWidth.mockRestore();
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
