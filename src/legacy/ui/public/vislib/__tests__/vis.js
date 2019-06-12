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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import series from 'fixtures/vislib/mock_data/date_histogram/_series';
import columns from 'fixtures/vislib/mock_data/date_histogram/_columns';
import rows from 'fixtures/vislib/mock_data/date_histogram/_rows';
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import '../../persisted_state';

const dataArray = [
  series,
  columns,
  rows,
  stackedSeries
];

const names = [
  'series',
  'columns',
  'rows',
  'stackedSeries'
];


dataArray.forEach(function (data, i) {
  describe('Vislib Vis Test Suite for ' + names[i] + ' Data', function () {
    const beforeEvent = 'click';
    const afterEvent = 'brush';
    let vis;
    let persistedState;
    let secondVis;
    let numberOfCharts;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, $injector) {
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new ($injector.get('PersistedState'))();
      secondVis = Private(FixturesVislibVisFixtureProvider)();
    }));

    afterEach(function () {
      vis.destroy();
      secondVis.destroy();
    });

    describe('render Method', function () {
      beforeEach(function () {
        vis.render(data, persistedState);
        numberOfCharts = vis.handler.charts.length;
      });

      it('should bind data to this object', function () {
        expect(_.isObject(vis.data)).to.be(true);
      });

      it('should instantiate a handler object', function () {
        expect(_.isObject(vis.handler)).to.be(true);
      });

      it('should append a chart', function () {
        expect($('.chart').length).to.be(numberOfCharts);
      });

      it('should throw an error if no data is provided', function () {
        expect(function () {
          vis.render(null, persistedState);
        }).to.throwError();
      });

    });

    describe('getLegendColors method', () => {
      it ('should return null if no colors are defined', () => {
        expect(vis.getLegendColors()).to.equal(null);
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.render(data, persistedState);
        secondVis.render(data, persistedState);
        secondVis.destroy();
      });

      it('should remove all DOM elements from el', function () {
        expect($(secondVis.el).find('.visWrapper').length).to.be(0);
      });

      it('should not remove visualizations that have not been destroyed', function () {
        expect($(vis.el).find('.visWrapper').length).to.be(1);
      });
    });

    describe('set Method', function () {
      beforeEach(function () {
        vis.render(data, persistedState);
        vis.set('addLegend', false);
        vis.set('offset', 'wiggle');
      });

      it('should set an attribute', function () {
        expect(vis.get('addLegend')).to.be(false);
        expect(vis.get('offset')).to.be('wiggle');
      });
    });

    describe('get Method', function () {
      beforeEach(function () {
        vis.render(data, persistedState);
      });

      it('should get attribute values', function () {
        expect(vis.get('addLegend')).to.be(true);
        expect(vis.get('addTooltip')).to.be(true);
        expect(vis.get('type')).to.be('point_series');
      });
    });

    describe('on Method', function () {
      let listeners;

      beforeEach(function () {
        listeners = [
          function () {},
          function () {}
        ];

        // Add event and listeners to chart
        listeners.forEach(function (listener) {
          vis.on(beforeEvent, listener);
        });

        // Render chart
        vis.render(data, persistedState);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });
      });

      afterEach(function () {
        vis.off(beforeEvent);
        vis.off(afterEvent);
      });

      it('should add an event and its listeners', function () {
        listeners.forEach(function (listener) {
          expect(vis.listeners(beforeEvent)).to.contain(listener);
        });

        listeners.forEach(function (listener) {
          expect(vis.listeners(afterEvent)).to.contain(listener);
        });
      });

      it('should cause a listener for each event to be attached to each chart', function () {
        const charts = vis.handler.charts;

        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be.above(0);
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
        vis.render(data, persistedState);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });

        // Turn off event listener after chart is rendered
        vis.off(afterEvent, listener1);
      });

      afterEach(function () {
        vis.off(beforeEvent);
        vis.off(afterEvent);
      });

      it('should remove a listener', function () {
        const charts = vis.handler.charts;

        expect(vis.listeners(beforeEvent)).to.not.contain(listener1);
        expect(vis.listeners(beforeEvent)).to.contain(listener2);

        expect(vis.listeners(afterEvent)).to.not.contain(listener1);
        expect(vis.listeners(afterEvent)).to.contain(listener2);

        // Events should still be attached to charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be.above(0);
        });
      });

      it('should remove the event and all listeners when only event passed an argument', function () {
        const charts = vis.handler.charts;
        vis.off(afterEvent);

        // should remove 'brush' event
        expect(vis.listeners(beforeEvent)).to.contain(listener2);
        expect(vis.listeners(afterEvent)).to.not.contain(listener2);

        // should remove the event from the charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be(0);
        });
      });

      it('should remove the event from the chart when the last listener is removed', function () {
        const charts = vis.handler.charts;
        vis.off(afterEvent, listener2);

        expect(vis.listenerCount(afterEvent)).to.be(0);

        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(afterEvent)).to.be(0);
        });
      });
    });
  });
});
