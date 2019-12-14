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

import d3 from 'd3';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import $ from 'jquery';
import '../../../persisted_state';
import { Axis } from '../../lib/axis';
import { VisConfig } from '../../lib/vis_config';

describe('Vislib xAxis Class Test Suite', function() {
  let persistedState;
  let xAxis;
  let el;
  let fixture;
  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
    xAxisOrderedValues: [
      1408734060000,
      1408734090000,
      1408734120000,
      1408734150000,
      1408734180000,
      1408734210000,
      1408734240000,
      1408734270000,
      1408734300000,
      1408734330000,
    ],
    series: [
      {
        label: 'Count',
        values: [
          {
            x: 1408734060000,
            y: 8,
          },
          {
            x: 1408734090000,
            y: 23,
          },
          {
            x: 1408734120000,
            y: 30,
          },
          {
            x: 1408734150000,
            y: 28,
          },
          {
            x: 1408734180000,
            y: 36,
          },
          {
            x: 1408734210000,
            y: 30,
          },
          {
            x: 1408734240000,
            y: 26,
          },
          {
            x: 1408734270000,
            y: 22,
          },
          {
            x: 1408734300000,
            y: 29,
          },
          {
            x: 1408734330000,
            y: 24,
          },
        ],
      },
    ],
    xAxisFormatter: function(thing) {
      return new Date(thing);
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      persistedState = new ($injector.get('PersistedState'))();

      el = d3
        .select('body')
        .append('div')
        .attr('class', 'visAxis--x')
        .style('height', '40px');

      fixture = el.append('div').attr('class', 'x-axis-div');

      const visConfig = new VisConfig(
        {
          type: 'histogram',
        },
        data,
        persistedState,
        $('.x-axis-div')[0]
      );
      xAxis = new Axis(visConfig, {
        type: 'category',
        id: 'CategoryAxis-1',
      });
    })
  );

  afterEach(function() {
    fixture.remove();
    el.remove();
  });

  describe('render Method', function() {
    beforeEach(function() {
      xAxis.render();
    });

    it('should append an svg to div', function() {
      expect(el.selectAll('svg').length).to.be(1);
    });

    it('should append a g element to the svg', function() {
      expect(el.selectAll('svg').select('g').length).to.be(1);
    });

    it('should append ticks with text', function() {
      expect(!!el.selectAll('svg').selectAll('.tick text')).to.be(true);
    });
  });

  describe('getScale, getDomain, getTimeDomain, and getRange Methods', function() {
    let timeScale;
    let width;
    let range;

    beforeEach(function() {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
      timeScale = xAxis.getScale();
      range = xAxis.axisScale.getRange(width);
    });

    it('should return a function', function() {
      expect(_.isFunction(timeScale)).to.be(true);
    });

    it('should return the correct domain', function() {
      expect(_.isDate(timeScale.domain()[0])).to.be(true);
      expect(_.isDate(timeScale.domain()[1])).to.be(true);
    });

    it('should return the min and max dates', function() {
      expect(timeScale.domain()[0].toDateString()).to.be(new Date(1408734060000).toDateString());
      expect(timeScale.domain()[1].toDateString()).to.be(new Date(1408734330000).toDateString());
    });

    it('should return the correct range', function() {
      expect(range[0]).to.be(0);
      expect(range[1]).to.be(width);
    });
  });

  describe('getOrdinalDomain Method', function() {
    let ordinalScale;
    let ordinalDomain;
    let width;

    beforeEach(function() {
      width = $('.x-axis-div').width();
      xAxis.ordered = null;
      xAxis.axisConfig.ordered = null;
      xAxis.getAxis(width);
      ordinalScale = xAxis.getScale();
      ordinalDomain = ordinalScale.domain(['this', 'should', 'be', 'an', 'array']);
    });

    it('should return an ordinal scale', function() {
      expect(ordinalDomain.domain()[0]).to.be('this');
      expect(ordinalDomain.domain()[4]).to.be('array');
    });

    it('should return an array of values', function() {
      expect(Array.isArray(ordinalDomain.domain())).to.be(true);
    });
  });

  describe('getXScale Method', function() {
    let width;
    let xScale;

    beforeEach(function() {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
      xScale = xAxis.getScale();
    });

    it('should return a function', function() {
      expect(_.isFunction(xScale)).to.be(true);
    });

    it('should return a domain', function() {
      expect(_.isDate(xScale.domain()[0])).to.be(true);
      expect(_.isDate(xScale.domain()[1])).to.be(true);
    });

    it('should return a range', function() {
      expect(xScale.range()[0]).to.be(0);
      expect(xScale.range()[1]).to.be(width);
    });
  });

  describe('getXAxis Method', function() {
    let width;

    beforeEach(function() {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
    });

    it('should create an getScale function on the xAxis class', function() {
      expect(_.isFunction(xAxis.getScale())).to.be(true);
    });
  });

  describe('draw Method', function() {
    it('should be a function', function() {
      expect(_.isFunction(xAxis.draw())).to.be(true);
    });
  });
});
