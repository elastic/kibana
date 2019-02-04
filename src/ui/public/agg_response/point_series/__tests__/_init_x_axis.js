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
import expect from 'expect.js';
import { initXAxis } from '../_init_x_axis';

describe('initXAxis', function () {

  const baseChart = {
    aspects: {
      x: [{
        accessor: 'col-0-2',
        format: {},
        title: 'label',
        params: {}
      }]
    }
  };
  const table = {
    rows: [
      { 'col-0-2': 0 },
      { 'col-0-2': 100 },
      { 'col-0-2': 200 },
      { 'col-0-2': 300 },
    ]
  };

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    const chart = _.cloneDeep(baseChart);
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format);
  });

  it('makes the chart ordered if the agg is ordered', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x[0].params.interval = 10;

    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');
  });

  it('reads the interval param from table output, overwriting current interval', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x[0].params.interval = 10;
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.have.property('interval', 100);
  });
  it('use existing interval if table has one or zero rows', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x[0].params.interval = 10;
    const table = {
      rows: [
        { 'col-0-2': 50 },
      ]
    };
    initXAxis(chart, table);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormat', chart.aspects.x[0].format)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.have.property('interval', 10);
  });
});
