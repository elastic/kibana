/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { tabifyGetColumns } from './get_columns';
import type { TabbedAggColumn } from './types';
import { AggConfigs } from '../aggs';
import { mockAggTypesRegistry } from '../aggs/test_helpers';

describe('get columns', () => {
  const typesRegistry = mockAggTypesRegistry();

  const createAggConfigs = (aggs: any[] = []) => {
    const fields = [
      {
        name: '@timestamp',
      },
      {
        name: 'bytes',
      },
    ];

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: (name: string) => fields.find((f) => f.name === name),
        filter: () => fields,
      },
    } as any;

    return new AggConfigs(indexPattern, aggs, { typesRegistry });
  };

  test('should inject the metric after each bucket if the vis is hierarchical', () => {
    const columns = tabifyGetColumns(
      createAggConfigs([
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        {
          type: 'count',
        },
      ]).aggs,
      false
    );

    expect(columns).toHaveLength(8);

    columns.forEach((column, i) => {
      expect(column).toHaveProperty('aggConfig');
      expect(column.aggConfig.type).toHaveProperty('name', i % 2 ? 'count' : 'date_histogram');
    });
  });

  test('should inject the multiple metrics after each bucket if the vis is hierarchical', () => {
    const columns = tabifyGetColumns(
      createAggConfigs([
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
        { type: 'sum', schema: 'metric', params: { field: 'bytes' } },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
      ]).aggs,
      false
    );

    function checkColumns(column: TabbedAggColumn, i: number) {
      expect(column).toHaveProperty('aggConfig');

      switch (i) {
        case 0:
          expect(column.aggConfig.type).toHaveProperty('name', 'date_histogram');
          break;
        case 1:
          expect(column.aggConfig.type).toHaveProperty('name', 'avg');
          break;
        case 2:
          expect(column.aggConfig.type).toHaveProperty('name', 'sum');
          break;
      }
    }

    expect(columns).toHaveLength(12);

    for (let i = 0; i < columns.length; i += 3) {
      columns.slice(i, i + 3).forEach(checkColumns);
    }
  });

  test('should put all metrics at the end of the columns if the vis is not hierarchical', () => {
    const columns = tabifyGetColumns(
      createAggConfigs([
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '20s' },
        },
        { type: 'sum', schema: 'metric', params: { field: '@timestamp' } },
        {
          type: 'date_histogram',
          schema: 'segment',
          params: { field: '@timestamp', interval: '10s' },
        },
      ]).aggs,
      false
    );

    expect(columns.map((c) => c.name)).toEqual([
      '@timestamp per 20 seconds',
      'Sum of @timestamp',
      '@timestamp per 10 seconds',
      'Sum of @timestamp',
    ]);
  });

  test('should not fail if there is no field for date histogram agg', () => {
    const columns = tabifyGetColumns(
      createAggConfigs([
        {
          type: 'date_histogram',
          schema: 'segment',
          params: {},
        },
        { type: 'sum', schema: 'metric', params: { field: '@timestamp' } },
      ]).aggs,
      false
    );

    expect(columns.map((c) => c.name)).toEqual(['', 'Sum of @timestamp']);
  });
});
