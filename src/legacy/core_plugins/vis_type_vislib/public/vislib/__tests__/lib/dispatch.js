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
import d3 from 'd3';
import expect from '@kbn/expect';

// Data
import data from './fixtures/mock_data/date_histogram/_series';

import { getVis, getMockUiState } from './fixtures/_vis_fixture';

describe('Vislib Dispatch Class Test Suite', function() {
  function destroyVis(vis) {
    vis.destroy();
  }

  function getEls(element, n, type) {
    return d3
      .select(element)
      .data(new Array(n))
      .enter()
      .append(type);
  }

  describe('', function() {
    let vis;
    let mockUiState;

    beforeEach(() => {
      vis = getVis();
      mockUiState = getMockUiState();
      vis.render(data, mockUiState);
    });

    afterEach(function() {
      destroyVis(vis);
    });

    it('implements on, off, emit methods', function() {
      const events = _.pluck(vis.handler.charts, 'events');
      expect(events.length).to.be.above(0);
      events.forEach(function(dispatch) {
        expect(dispatch).to.have.property('on');
        expect(dispatch).to.have.property('off');
        expect(dispatch).to.have.property('emit');
      });
    });
  });

  describe('Stock event handlers', function() {
    let vis;
    let mockUiState;

    beforeEach(() => {
      mockUiState = getMockUiState();
      vis = getVis();
      vis.on('brush', _.noop);
      vis.render(data, mockUiState);
    });

    afterEach(function() {
      destroyVis(vis);
    });

    describe('addEvent method', function() {
      it('returns a function that binds the passed event to a selection', function() {
        const chart = _.first(vis.handler.charts);
        const apply = chart.events.addEvent('event', _.noop);
        expect(apply).to.be.a('function');

        const els = getEls(vis.element, 3, 'div');
        apply(els);
        els.each(function() {
          expect(d3.select(this).on('event')).to.be(_.noop);
        });
      });
    });

    // test the addHoverEvent, addClickEvent methods by
    // checking that they return function which bind the events expected
    function checkBoundAddMethod(name, event) {
      describe(name + ' method', function() {
        it('should be a function', function() {
          vis.handler.charts.forEach(function(chart) {
            expect(chart.events[name]).to.be.a('function');
          });
        });

        it('returns a function that binds ' + event + ' events to a selection', function() {
          const chart = _.first(vis.handler.charts);
          const apply = chart.events[name](chart.series[0].chartEl);
          expect(apply).to.be.a('function');

          const els = getEls(vis.element, 3, 'div');
          apply(els);
          els.each(function() {
            expect(d3.select(this).on(event)).to.be.a('function');
          });
        });
      });
    }

    checkBoundAddMethod('addHoverEvent', 'mouseover');
    checkBoundAddMethod('addMouseoutEvent', 'mouseout');
    checkBoundAddMethod('addClickEvent', 'click');

    describe('addMousePointer method', function() {
      it('should be a function', function() {
        vis.handler.charts.forEach(function(chart) {
          const pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).to.be(true);
        });
      });
    });

    describe('clickEvent handler', () => {
      describe('for pie chart', () => {
        it('prepares data points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = { rawData: { column: 0, row: 0, table: {}, value: 0 } };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: true });
          expect(response.data).to.eql(expectedResponse);
        });

        it('remove invalid points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = {
            rawData: { column: 0, row: 0, table: {}, value: 0 },
            yRaw: { table: {}, value: 0 },
          };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: true });
          expect(response.data).to.eql(expectedResponse);
        });
      });

      describe('for xy charts', () => {
        it('prepares data points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = { xRaw: { column: 0, row: 0, table: {}, value: 0 } };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: false });
          expect(response.data).to.eql(expectedResponse);
        });

        it('remove invalid points', () => {
          const expectedResponse = [{ column: 0, row: 0, table: {}, value: 0 }];
          const d = {
            xRaw: { column: 0, row: 0, table: {}, value: 0 },
            yRaw: { table: {}, value: 0 },
          };
          const chart = _.first(vis.handler.charts);
          const response = chart.events.clickEventResponse(d, { isSlices: false });
          expect(response.data).to.eql(expectedResponse);
        });
      });
    });
  });

  describe('Custom event handlers', function() {
    it('should attach whatever gets passed on vis.on() to chart.events', function(done) {
      const vis = getVis();
      const mockUiState = getMockUiState();
      vis.on('someEvent', _.noop);
      vis.render(data, mockUiState);

      vis.handler.charts.forEach(function(chart) {
        expect(chart.events.listenerCount('someEvent')).to.be(1);
      });

      destroyVis(vis);
      done();
    });

    it('can be added after rendering', function() {
      const vis = getVis();
      const mockUiState = getMockUiState();
      vis.render(data, mockUiState);
      vis.on('someEvent', _.noop);

      vis.handler.charts.forEach(function(chart) {
        expect(chart.events.listenerCount('someEvent')).to.be(1);
      });

      destroyVis(vis);
    });
  });
});
