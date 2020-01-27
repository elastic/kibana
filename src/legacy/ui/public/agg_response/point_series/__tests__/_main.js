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
import { buildPointSeriesData } from '../point_series';

describe('pointSeriesChartDataFromTable', function() {
  this.slow(1000);

  it('handles a table with just a count', function() {
    const table = {
      columns: [{ id: '0' }],
      rows: [{ '0': 100 }],
    };
    const chartData = buildPointSeriesData(table, {
      y: [
        {
          accessor: 0,
          params: {},
        },
      ],
    });

    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(1);
    const series = chartData.series[0];
    expect(series.values).to.have.length(1);
    expect(series.values[0])
      .to.have.property('x', '_all')
      .and.have.property('y', 100);
  });

  it('handles a table with x and y column', function() {
    const table = {
      columns: [
        { id: '0', name: 'x' },
        { id: '1', name: 'Count' },
      ],
      rows: [
        { '0': 1, '1': 200 },
        { '0': 2, '1': 200 },
        { '0': 3, '1': 200 },
      ],
    };

    const dimensions = {
      x: [{ accessor: 0, params: {} }],
      y: [{ accessor: 1, params: {} }],
    };

    const chartData = buildPointSeriesData(table, dimensions);

    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(1);
    const series = chartData.series[0];
    expect(series).to.have.property('label', 'Count');
    expect(series.values).to.have.length(3);
  });

  it('handles a table with an x and two y aspects', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1', name: 'Count-0' }, { id: '2', name: 'Count-1' }],
      rows: [
        { '0': 1, '1': 200, '2': 300 },
        { '0': 2, '1': 200, '2': 300 },
        { '0': 3, '1': 200, '2': 300 },
      ],
    };

    const dimensions = {
      x: [{ accessor: 0, params: {} }],
      y: [
        { accessor: 1, params: {} },
        { accessor: 2, params: {} },
      ],
    };

    const chartData = buildPointSeriesData(table, dimensions);
    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(2);
    chartData.series.forEach(function(siri, i) {
      expect(siri).to.have.property('label', `Count-${i}`);
      expect(siri.values).to.have.length(3);
    });
  });

  it('handles a table with an x, a series, and two y aspects', function() {
    const table = {
      columns: [
        { id: '0', name: 'x' },
        { id: '1', name: 'series', fieldFormatter: _.identity },
        { id: '2', name: 'y1' },
        { id: '3', name: 'y2' },
      ],
      rows: [
        { '0': 1, '1': 0, '2': 300, '3': 400 },
        { '0': 1, '1': 1, '2': 300, '3': 400 },
        { '0': 2, '1': 0, '2': 300, '3': 400 },
        { '0': 2, '1': 1, '2': 300, '3': 400 },
      ],
    };

    const dimensions = {
      x: [{ accessor: 0, params: {} }],
      series: [{ accessor: 1, params: {} }],
      y: [
        { accessor: 2, params: {} },
        { accessor: 3, params: {} },
      ],
    };

    const chartData = buildPointSeriesData(table, dimensions);
    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    // one series for each extension, and then one for each metric inside
    expect(chartData.series).to.have.length(4);
    chartData.series.forEach(function(siri) {
      expect(siri.values).to.have.length(2);
    });
  });
});
