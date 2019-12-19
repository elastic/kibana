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
import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { AxisTitle } from '../../lib/axis/axis_title';
import { AxisConfig } from '../../lib/axis/axis_config';
import { VisConfig } from '../../lib/vis_config';
import { Data } from '../../lib/data';
import 'ui/persisted_state';

describe('Vislib AxisTitle Class Test Suite', function() {
  let PersistedState;
  let el;
  let dataObj;
  let xTitle;
  let yTitle;
  let visConfig;
  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
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
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      PersistedState = $injector.get('PersistedState');

      el = d3
        .select('body')
        .append('div')
        .attr('class', 'visWrapper');

      el.append('div')
        .attr('class', 'visAxis__column--bottom')
        .append('div')
        .attr('class', 'axis-title y-axis-title')
        .style('height', '20px')
        .style('width', '20px');

      el.append('div')
        .attr('class', 'visAxis__column--left')
        .append('div')
        .attr('class', 'axis-title x-axis-title')
        .style('height', '20px')
        .style('width', '20px');

      dataObj = new Data(data, new PersistedState());
      visConfig = new VisConfig(
        {
          type: 'histogram',
        },
        data,
        new PersistedState(),
        el.node()
      );
      const xAxisConfig = new AxisConfig(visConfig, {
        position: 'bottom',
        title: {
          text: dataObj.get('xAxisLabel'),
        },
      });
      const yAxisConfig = new AxisConfig(visConfig, {
        position: 'left',
        title: {
          text: dataObj.get('yAxisLabel'),
        },
      });
      xTitle = new AxisTitle(xAxisConfig);
      yTitle = new AxisTitle(yAxisConfig);
    })
  );

  afterEach(function() {
    el.remove();
  });

  it('should not do anything if title.show is set to false', function() {
    const xAxisConfig = new AxisConfig(visConfig, {
      position: 'bottom',
      show: false,
      title: {
        text: dataObj.get('xAxisLabel'),
      },
    });
    xTitle = new AxisTitle(xAxisConfig);
    xTitle.render();
    expect(
      $(el.node())
        .find('.x-axis-title')
        .find('svg').length
    ).to.be(0);
  });

  describe('render Method', function() {
    beforeEach(function() {
      xTitle.render();
      yTitle.render();
    });

    it('should append an svg to div', function() {
      expect(el.select('.x-axis-title').selectAll('svg').length).to.be(1);
      expect(el.select('.y-axis-title').selectAll('svg').length).to.be(1);
    });

    it('should append a g element to the svg', function() {
      expect(
        el
          .select('.x-axis-title')
          .selectAll('svg')
          .select('g').length
      ).to.be(1);
      expect(
        el
          .select('.y-axis-title')
          .selectAll('svg')
          .select('g').length
      ).to.be(1);
    });

    it('should append text', function() {
      expect(
        !!el
          .select('.x-axis-title')
          .selectAll('svg')
          .selectAll('text')
      ).to.be(true);
      expect(
        !!el
          .select('.y-axis-title')
          .selectAll('svg')
          .selectAll('text')
      ).to.be(true);
    });
  });

  describe('draw Method', function() {
    it('should be a function', function() {
      expect(_.isFunction(xTitle.draw())).to.be(true);
    });
  });
});
