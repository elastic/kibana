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
import { layoutTypes } from '../../../../lib/layout/layout_types';

describe('Vislib Column Layout Test Suite', function() {
  let columnLayout;
  let el;
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
    ngMock.inject(function() {
      el = d3
        .select('body')
        .append('div')
        .attr('class', 'visualization');
      columnLayout = layoutTypes.point_series(el, data);
    })
  );

  afterEach(function() {
    el.remove();
  });

  it('should return an array of objects', function() {
    expect(Array.isArray(columnLayout)).to.be(true);
    expect(_.isObject(columnLayout[0])).to.be(true);
  });

  it('should throw an error when the wrong number or no arguments provided', function() {
    expect(function() {
      layoutTypes.point_series(el);
    }).to.throwError();
  });
});
