/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import type { Dimensions } from '@kbn/vis-type-xy-plugin/public';

import { buildPointSeriesData } from './point_series';
import { Table, Column } from '../../types';
import { setFormatService } from '../../../services';
import { Serie } from './_add_to_siri';

describe('pointSeriesChartDataFromTable', function () {
  beforeAll(() => {
    setFormatService({
      deserialize: () => ({
        convert: jest.fn((v) => v),
      }),
    } as any);
  });

  it('handles a table with just a count', function () {
    const table = {
      columns: [{ id: '0' } as Column],
      rows: [{ '0': 100 }],
    } as Table;
    const chartData = buildPointSeriesData(table, {
      y: [
        {
          accessor: 0,
          params: {},
        },
      ],
    } as Dimensions);

    expect(chartData).toEqual(expect.any(Object));
    expect(chartData.series).toEqual(expect.any(Array));
    expect(chartData.series).toHaveLength(1);
    const series = chartData.series[0];
    expect(series.values).toHaveLength(1);
    expect(series.values[0]).toHaveProperty('x', '_all');
    expect(series.values[0]).toHaveProperty('y', 100);
  });

  it('handles a table with x and y column', function () {
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
    } as Table;

    const dimensions = {
      x: { accessor: 0, params: {} },
      y: [{ accessor: 1, params: {} }],
    } as Dimensions;

    const chartData = buildPointSeriesData(table, dimensions);

    expect(chartData).toEqual(expect.any(Object));
    expect(chartData.series).toEqual(expect.any(Array));
    expect(chartData.series).toHaveLength(1);
    const series = chartData.series[0];
    expect(series).toHaveProperty('label', 'Count');
    expect(series.values).toHaveLength(3);
  });

  it('handles a table with an x and two y aspects', function () {
    const table = {
      columns: [{ id: '0' }, { id: '1', name: 'Count-0' }, { id: '2', name: 'Count-1' }],
      rows: [
        { '0': 1, '1': 200, '2': 300 },
        { '0': 2, '1': 200, '2': 300 },
        { '0': 3, '1': 200, '2': 300 },
      ],
    } as Table;

    const dimensions = {
      x: { accessor: 0, params: {} },
      y: [
        { accessor: 1, params: {} },
        { accessor: 2, params: {} },
      ],
    } as Dimensions;

    const chartData = buildPointSeriesData(table, dimensions);
    expect(chartData).toEqual(expect.any(Object));
    expect(chartData.series).toEqual(expect.any(Array));
    expect(chartData.series).toHaveLength(2);
    chartData.series.forEach(function (siri: Serie, i: number) {
      expect(siri).toHaveProperty('label', `Count-${i}`);
      expect(siri.values).toHaveLength(3);
    });
  });

  it('handles a table with an x, a series, and two y aspects', function () {
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
      x: { accessor: 0, params: {} },
      series: [{ accessor: 1, params: {} }],
      y: [
        { accessor: 2, params: {} },
        { accessor: 3, params: {} },
      ],
    } as Dimensions;

    const chartData = buildPointSeriesData(table, dimensions);
    expect(chartData).toEqual(expect.any(Object));
    expect(chartData.series).toEqual(expect.any(Array));
    // one series for each extension, and then one for each metric inside
    expect(chartData.series).toHaveLength(4);
    chartData.series.forEach(function (siri: Serie) {
      expect(siri.values).toHaveLength(2);
    });
  });
});
