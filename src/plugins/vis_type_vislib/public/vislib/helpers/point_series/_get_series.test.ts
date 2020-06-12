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

import { getSeries } from './_get_series';
import { setFormatService } from '../../../services';
import { Chart, Aspect } from './point_series';
import { Table, Column } from '../../types';
import { Serie } from './_add_to_siri';
import { Point } from './_get_point';

describe('getSeries', function () {
  beforeAll(() => {
    setFormatService({
      deserialize: () => ({
        convert: jest.fn((v) => v),
      }),
    } as any);
  });

  it('produces a single series with points for each row', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: '0' }],
        y: [{ accessor: '1', title: 'y' }],
        z: [{ accessor: '2' }],
      },
    } as Chart;

    const series = getSeries(table, chart);

    expect(series).toEqual(expect.any(Array));
    expect(series).toHaveLength(1);

    const siri = series[0];

    expect(siri).toEqual(expect.any(Object));
    expect(siri).toHaveProperty('label', chart.aspects.y[0].title);
    expect(siri).toHaveProperty('values');

    expect(siri.values).toEqual(expect.any(Array));
    expect(siri.values).toHaveLength(5);

    siri.values.forEach((point) => {
      expect(point).toHaveProperty('x', 1);
      expect(point).toHaveProperty('y', 2);
      expect(point).toHaveProperty('z', 3);
    });
  });

  it('adds the seriesId to each point', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: '0' }],
        y: [
          { accessor: '1', title: '0' },
          { accessor: '2', title: '1' },
        ],
      },
    } as Chart;

    const series = getSeries(table, chart);

    series[0].values.forEach((point) => {
      expect(point).toHaveProperty('seriesId', '1');
    });

    series[1].values.forEach((point) => {
      expect(point).toHaveProperty('seriesId', '2');
    });
  });

  it('produces multiple series if there are multiple y aspects', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: '0' }],
        y: [
          { accessor: '1', title: '0' },
          { accessor: '2', title: '1' },
        ],
      },
    } as Chart;

    const series = getSeries(table, chart);

    expect(series).toEqual(expect.any(Array));
    expect(series).toHaveLength(2);

    series.forEach(function (siri: Serie, i: number) {
      expect(siri).toEqual(expect.any(Object));
      expect(siri).toHaveProperty('label', '' + i);
      expect(siri).toHaveProperty('values');

      expect(siri.values).toEqual(expect.any(Array));
      expect(siri.values).toHaveLength(5);

      siri.values.forEach(function (point: Point) {
        expect(point).toHaveProperty('x', 1);
        expect(point).toHaveProperty('y', i + 2);
      });
    });
  });

  it('produces multiple series if there is a series aspect', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: -1 } as Aspect],
        series: [{ accessor: '0' }],
        y: [{ accessor: '1', title: '0' }],
      },
    } as Chart;

    const series = getSeries(table, chart);

    expect(series).toEqual(expect.any(Array));
    expect(series).toHaveLength(2);

    series.forEach(function (siri: Serie, i: number) {
      expect(siri).toEqual(expect.any(Object));
      expect(siri).toHaveProperty('label', '' + i);
      expect(siri).toHaveProperty('values');

      expect(siri.values).toEqual(expect.any(Array));
      expect(siri.values).toHaveLength(3);

      siri.values.forEach(function (point: Point) {
        expect(point).toHaveProperty('y', 2);
      });
    });
  });

  it('produces multiple series if there is a series aspect and multiple y aspects', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
        { '0': 0, '1': 3, '2': 4 },
        { '0': 1, '1': 3, '2': 4 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: -1 } as Aspect],
        series: [{ accessor: '0' }],
        y: [
          { accessor: '1', title: '0' },
          { accessor: '2', title: '1' },
        ],
      },
    } as Chart;

    const series = getSeries(table, chart);

    expect(series).toEqual(expect.any(Array));
    expect(series).toHaveLength(4); // two series * two metrics

    checkSiri(series[0], '0: 0', 3);
    checkSiri(series[1], '0: 1', 4);
    checkSiri(series[2], '1: 0', 3);
    checkSiri(series[3], '1: 1', 4);

    function checkSiri(siri: Serie, label: string, y: number) {
      expect(siri).toEqual(expect.any(Object));
      expect(siri).toHaveProperty('label', label);
      expect(siri).toHaveProperty('values');

      expect(siri.values).toEqual(expect.any(Array));
      expect(siri.values).toHaveLength(3);

      siri.values.forEach(function (point: Point) {
        expect(point).toHaveProperty('y', y);
      });
    }
  });

  it('produces a series list in the same order as its corresponding metric column', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1' }, { id: '3' }] as Column[],
      rows: [
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
        { '0': 1, '1': 2, '2': 3 },
        { '0': 0, '1': 2, '2': 3 },
      ],
    } as Table;

    const chart = {
      aspects: {
        x: [{ accessor: -1 } as Aspect],
        series: [{ accessor: '0' }],
        y: [
          { accessor: '1', title: '0' },
          { accessor: '2', title: '1' },
        ],
      },
    } as Chart;

    const series = getSeries(table, chart);
    expect(series[0]).toHaveProperty('label', '0: 0');
    expect(series[1]).toHaveProperty('label', '0: 1');
    expect(series[2]).toHaveProperty('label', '1: 0');
    expect(series[3]).toHaveProperty('label', '1: 1');

    // switch the order of the y columns
    chart.aspects.y = chart.aspects.y.reverse();
    chart.aspects.y.forEach(function (y: any, i) {
      y.i = i;
    });

    const series2 = getSeries(table, chart);
    expect(series2[0]).toHaveProperty('label', '0: 1');
    expect(series2[1]).toHaveProperty('label', '0: 0');
    expect(series2[2]).toHaveProperty('label', '1: 1');
    expect(series2[3]).toHaveProperty('label', '1: 0');
  });
});
