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
import '../../../../persisted_state';
import { Axis } from '../../../lib/axis';
import { VisConfig } from '../../../lib/vis_config';

describe('Vislib Axis Class Test Suite', function () {
  let persistedState;
  let yAxis;
  let el;
  let fixture;
  let seriesData;

  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458
    },
    series: [
      {
        label: 'Count',
        values: [
          {
            x: 1408734060000,
            y: 8
          },
          {
            x: 1408734090000,
            y: 23
          },
          {
            x: 1408734120000,
            y: 30
          },
          {
            x: 1408734130000,
            y: 30
          },
          {
            x: 1408734150000,
            y: 28
          }
        ]
      },
      {
        label: 'Count2',
        values: [
          {
            x: 1408734060000,
            y: 8
          },
          {
            x: 1408734090000,
            y: 23
          },
          {
            x: 1408734120000,
            y: 30
          },
          {
            x: 1408734140000,
            y: 30
          },
          {
            x: 1408734150000,
            y: 28
          }
        ]
      }
    ],
    xAxisFormatter: function (thing) {
      return new Date(thing);
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    persistedState = new ($injector.get('PersistedState'))();

    el = d3.select('body').append('div')
      .attr('class', 'visAxis--x')
      .style('height', '40px');

    fixture = el.append('div')
      .attr('class', 'x-axis-div');

    const visConfig = new VisConfig({
      type: 'histogram'
    }, data, persistedState, $('.x-axis-div')[0]);
    yAxis = new Axis(visConfig, {
      type: 'value',
      id: 'ValueAxis-1'
    });

    seriesData = data.series.map(series => {
      return series.values;
    });
  }));

  afterEach(function () {
    fixture.remove();
    el.remove();
  });

  describe('_stackNegAndPosVals Method', function () {

    it('should correctly stack positive values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 23
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28
        }
      ];
      const stackedData = yAxis._stackNegAndPosVals(seriesData);
      expect(stackedData[1]).to.eql(expectedResult);
    });

    it('should correctly stack pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 0
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 0
        }
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach(value => {
        value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).to.eql(expectedResult);
    });

    it('should correctly stack mixed pos and neg values', function () {
      const expectedResult = [
        {
          x: 1408734060000,
          y: 8,
          y0: 8
        },
        {
          x: 1408734090000,
          y: 23,
          y0: 0
        },
        {
          x: 1408734120000,
          y: 30,
          y0: 30
        },
        {
          x: 1408734140000,
          y: 30,
          y0: 0
        },
        {
          x: 1408734150000,
          y: 28,
          y0: 28
        }
      ];
      const dataClone = _.cloneDeep(seriesData);
      dataClone[0].forEach((value, i) => {
        if ((i % 2) === 1) value.y = -value.y;
      });
      const stackedData = yAxis._stackNegAndPosVals(dataClone);
      expect(stackedData[1]).to.eql(expectedResult);
    });

  });
});
