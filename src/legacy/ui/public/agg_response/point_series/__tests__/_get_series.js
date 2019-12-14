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
import { getSeries } from '../_get_series';

describe('getSeries', function() {
  it('produces a single series with points for each row', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: 0 }],
        y: [{ accessor: 1, title: 'y' }],
        z: { accessor: 2 },
      },
    };

    const series = getSeries(table, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(1);

    const siri = series[0];
    expect(siri)
      .to.be.an('object')
      .and.have.property('label', chart.aspects.y.title)
      .and.have.property('values');

    expect(siri.values)
      .to.be.an('array')
      .and.have.length(5);

    siri.values.forEach(function(point) {
      expect(point)
        .to.have.property('x', 1)
        .and.property('y', 2)
        .and.property('z', 3);
    });
  });

  it('adds the seriesId to each point', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: 0 }],
        y: [{ accessor: 1, title: '0' }, { accessor: 2, title: '1' }],
      },
    };

    const series = getSeries(table, chart);

    series[0].values.forEach(function(point) {
      expect(point).to.have.property('seriesId', 1);
    });

    series[1].values.forEach(function(point) {
      expect(point).to.have.property('seriesId', 2);
    });
  });

  it('produces multiple series if there are multiple y aspects', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: 0 }],
        y: [{ accessor: 1, title: '0' }, { accessor: 2, title: '1' }],
      },
    };

    const series = getSeries(table, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(2);

    series.forEach(function(siri, i) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', '' + i)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(5);

      siri.values.forEach(function(point) {
        expect(point)
          .to.have.property('x', 1)
          .and.property('y', i + 2);
      });
    });
  });

  it('produces multiple series if there is a series aspect', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: -1 }],
        series: [{ accessor: 0, fieldFormatter: _.identity }],
        y: [{ accessor: 1, title: '0' }],
      },
    };

    const series = getSeries(table, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(2);

    series.forEach(function(siri, i) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', '' + i)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(3);

      siri.values.forEach(function(point) {
        expect(point).to.have.property('y', 2);
      });
    });
  });

  it('produces multiple series if there is a series aspect and multiple y aspects', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: -1 }],
        series: [{ accessor: 0, fieldFormatter: _.identity }],
        y: [{ accessor: 1, title: '0' }, { accessor: 2, title: '1' }],
      },
    };

    const series = getSeries(table, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(4); // two series * two metrics

    checkSiri(series[0], '0: 0', 3);
    checkSiri(series[1], '0: 1', 4);
    checkSiri(series[2], '1: 0', 3);
    checkSiri(series[3], '1: 1', 4);

    function checkSiri(siri, label, y) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', label)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(3);

      siri.values.forEach(function(point) {
        expect(point).to.have.property('y', y);
      });
    }
  });

  it('produces a series list in the same order as its corresponding metric column', function() {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }],
      rows: [
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
      ],
    };

    const chart = {
      aspects: {
        x: [{ accessor: -1 }],
        series: [{ accessor: 0, fieldFormatter: _.identity }],
        y: [{ accessor: 1, title: '0' }, { accessor: 2, title: '1' }],
      },
    };

    const series = getSeries(table, chart);
    expect(series[0]).to.have.property('label', '0: 0');
    expect(series[1]).to.have.property('label', '0: 1');
    expect(series[2]).to.have.property('label', '1: 0');
    expect(series[3]).to.have.property('label', '1: 1');

    // switch the order of the y columns
    chart.aspects.y = chart.aspects.y.reverse();
    chart.aspects.y.forEach(function(y, i) {
      y.i = i;
    });

    const series2 = getSeries(table, chart);
    expect(series2[0]).to.have.property('label', '0: 1');
    expect(series2[1]).to.have.property('label', '0: 0');
    expect(series2[2]).to.have.property('label', '1: 1');
    expect(series2[3]).to.have.property('label', '1: 0');
  });
});
