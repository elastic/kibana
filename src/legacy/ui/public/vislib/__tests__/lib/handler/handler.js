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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';

// Data
import series from 'fixtures/vislib/mock_data/date_histogram/_series';
import columns from 'fixtures/vislib/mock_data/date_histogram/_columns';
import rows from 'fixtures/vislib/mock_data/date_histogram/_rows';
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import '../../../../persisted_state';
const dateHistogramArray = [series, columns, rows, stackedSeries];
const names = ['series', 'columns', 'rows', 'stackedSeries'];

dateHistogramArray.forEach(function(data, i) {
  describe('Vislib Handler Test Suite for ' + names[i] + ' Data', function() {
    let vis;
    let persistedState;
    const events = ['click', 'brush'];

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function(Private, $injector) {
        vis = Private(FixturesVislibVisFixtureProvider)();
        persistedState = new ($injector.get('PersistedState'))();
        vis.render(data, persistedState);
      })
    );

    afterEach(function() {
      vis.destroy();
    });

    describe('render Method', function() {
      it('should render charts', function() {
        expect(vis.handler.charts.length).to.be.greaterThan(0);
        vis.handler.charts.forEach(function(chart) {
          expect($(chart.chartEl).find('svg').length).to.be(1);
        });
      });
    });

    describe('enable Method', function() {
      let charts;

      beforeEach(function() {
        charts = vis.handler.charts;

        charts.forEach(function(chart) {
          events.forEach(function(event) {
            vis.handler.enable(event, chart);
          });
        });
      });

      it('should add events to chart and emit to the Events class', function() {
        charts.forEach(function(chart) {
          events.forEach(function(event) {
            expect(chart.events.listenerCount(event)).to.be.above(0);
          });
        });
      });
    });

    describe('disable Method', function() {
      let charts;

      beforeEach(function() {
        charts = vis.handler.charts;

        charts.forEach(function(chart) {
          events.forEach(function(event) {
            vis.handler.disable(event, chart);
          });
        });
      });

      it('should remove events from the chart', function() {
        charts.forEach(function(chart) {
          events.forEach(function(event) {
            expect(chart.events.listenerCount(event)).to.be(0);
          });
        });
      });
    });

    describe('removeAll Method', function() {
      beforeEach(function() {
        ngMock.inject(function() {
          vis.handler.removeAll(vis.el);
        });
      });

      it('should remove all DOM elements from the el', function() {
        expect($(vis.el).children().length).to.be(0);
      });
    });

    describe('error Method', function() {
      beforeEach(function() {
        vis.handler.error('This is an error!');
      });

      it('should return an error classed DOM element with a text message', function() {
        expect($(vis.el).find('.error').length).to.be(1);
        expect($('.error h4').html()).to.be('This is an error!');
      });
    });

    describe('destroy Method', function() {
      beforeEach(function() {
        vis.handler.destroy();
      });

      it('should destroy all the charts in the visualization', function() {
        expect(vis.handler.charts.length).to.be(0);
      });
    });

    describe('event proxying', function() {
      it('should only pass the original event object to downstream handlers', function(done) {
        const event = {};
        const chart = vis.handler.charts[0];

        const mockEmitter = function() {
          const args = Array.from(arguments);
          expect(args.length).to.be(2);
          expect(args[0]).to.be('click');
          expect(args[1]).to.be(event);
          done();
        };

        vis.emit = mockEmitter;
        vis.handler.enable('click', chart);
        chart.events.emit('click', event);
      });
    });
  });
});
