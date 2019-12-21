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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { VislibVisProvider } from '../../vis';
import { Chart } from '../../visualizations/_chart';

describe('Vislib _chart Test Suite', function() {
  let persistedState;
  let Vis;
  let vis;
  let el;
  let myChart;
  let config;
  const data = {
    hits: 621,
    label: '',
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
    tooltipFormatter: function(datapoint) {
      return datapoint;
    },
    xAxisFormatter: function(thing) {
      return thing;
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private, $injector) {
      Vis = Private(VislibVisProvider);
      persistedState = new ($injector.get('PersistedState'))();

      el = d3
        .select('body')
        .append('div')
        .attr('class', 'column-chart');

      config = {
        type: 'histogram',
        addTooltip: true,
        addLegend: true,
        zeroFill: true,
      };

      vis = new Vis(el[0][0], config);
      vis.render(data, persistedState);

      myChart = vis.handler.charts[0];
    })
  );

  afterEach(function() {
    el.remove();
    vis.destroy();
  });

  it('should be a constructor for visualization modules', function() {
    expect(myChart instanceof Chart).to.be(true);
  });

  it('should have a render method', function() {
    expect(typeof myChart.render === 'function').to.be(true);
  });
});
