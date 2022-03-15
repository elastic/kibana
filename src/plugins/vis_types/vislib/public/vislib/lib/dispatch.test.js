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
import data from '../../fixtures/mock_data/date_histogram/_series';

import { getMockUiState } from '../../fixtures/mocks';
import { getVis } from '../visualizations/_vis_fixture';

let mockedHTMLElementClientSizes;
let mockedSVGElementGetBBox;
let mockedSVGElementGetComputedTextLength;
let mockWidth;

describe('Vislib Dispatch Class Test Suite', function () {
  function destroyVis(vis) {
    vis.destroy();
  }

  function getEls(element, n, type) {
    return d3.select(element).data(new Array(n)).enter().append(type);
  }

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

  describe('', function () {
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
      destroyVis(vis);
    });

    test('implements on, off, emit methods', function () {
      const events = _.map(vis.handler.charts, 'events');
      expect(events.length).toBeGreaterThan(0);
      events.forEach(function (dispatch) {
        expect(dispatch).toHaveProperty('on');
        expect(dispatch).toHaveProperty('off');
        expect(dispatch).toHaveProperty('emit');
      });
    });
  });

  describe('Stock event handlers', function () {
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
      destroyVis(vis);
    });

    describe('addEvent method', function () {
      test('returns a function that binds the passed event to a selection', function () {
        const chart = _.first(vis.handler.charts);
        const apply = chart.events.addEvent('event', _.noop);
        expect(apply).toBeInstanceOf(Function);

        const els = getEls(vis.element, 3, 'div');
        apply(els);
        els.each(function () {
          expect(d3.select(this).on('event')).toBe(_.noop);
        });
      });
    });

    // test the addHoverEvent, addClickEvent methods by
    // checking that they return function which bind the events expected
    function checkBoundAddMethod(name, event) {
      describe(name + ' method', function () {
        test('should be a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.events[name]).toBeInstanceOf(Function);
          });
        });

        test('returns a function that binds ' + event + ' events to a selection', function () {
          const chart = _.first(vis.handler.charts);
          const apply = chart.events[name](chart.series[0].chartEl);
          expect(apply).toBeInstanceOf(Function);

          const els = getEls(vis.element, 3, 'div');
          apply(els);
          els.each(function () {
            expect(d3.select(this).on(event)).toBeInstanceOf(Function);
          });
        });
      });
    }

    checkBoundAddMethod('addHoverEvent', 'mouseover');
    checkBoundAddMethod('addMouseoutEvent', 'mouseout');
    checkBoundAddMethod('addClickEvent', 'click');

    describe('addMousePointer method', function () {
      test('should be a function', function () {
        vis.handler.charts.forEach(function (chart) {
          const pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).toBe(true);
        });
      });
    });

    describe('clickEvent handler', () => {
      describe('for pie chart', () => {
        test('prepares data points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = { rawData: { column: 0, row: 0, table: {}, value: 0 } };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: true });
          expect(response.data).toEqual(expectedResponse);
        });

        test('remove invalid points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = {
            rawData: { column: 0, row: 0, table: {}, value: 0 },
            yRaw: { table: {}, value: 0 },
          };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: true });
          expect(response.data).toEqual(expectedResponse);
        });
      });

      describe('for xy charts', () => {
        test('prepares data points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = { xRaw: { column: 0, row: 0, table: {}, value: 0 } };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: false });
          expect(response.data).toEqual(expectedResponse);
        });

        test('remove invalid points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = {
            xRaw: { column: 0, row: 0, table: {}, value: 0 },
            yRaw: { table: {}, value: 0 },
          };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: false });
          expect(response.data).toEqual(expectedResponse);
        });
      });
    });
  });

  describe('Custom event handlers', function () {
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
    const vis = getVis(config);
    const mockUiState = getMockUiState();
    test('should attach whatever gets passed on vis.on() to chart.events', function (done) {
      vis.on('someEvent', _.noop);
      vis.render(data, mockUiState);

      vis.handler.charts.forEach(function (chart) {
        expect(chart.events.listenerCount('someEvent')).toBe(1);
      });

      destroyVis(vis);
      done();
    });

    test('can be added after rendering', function () {
      vis.render(data, mockUiState);
      vis.on('someEvent', _.noop);

      vis.handler.charts.forEach(function (chart) {
        expect(chart.events.listenerCount('someEvent')).toBe(1);
      });

      destroyVis(vis);
    });
  });
});
