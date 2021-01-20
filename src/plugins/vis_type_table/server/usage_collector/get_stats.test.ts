/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';
import { getStats } from './get_stats';

const mockSavedObjects = [
  {
    _source: {
      visualization: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }, { "schema": "split", "enabled": true }], "params": { "row": true }}',
      },
    },
  },
  {
    _source: {
      visualization: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }, { "schema": "split", "enabled": false }], "params": { "row": true }}',
      },
    },
  },
  {
    _source: {
      visualization: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "split", "enabled": true }], "params": { "row": false }}',
      },
    },
  },
  {
    _source: {
      visualization: {
        visState: '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }]}',
      },
    },
  },
  {
    _source: {
      visualization: { visState: '{"type": "histogram"}' },
    },
  },
];

describe('vis_type_table getStats', () => {
  const mockIndex = '';
  const mockSearch = jest.fn();

  const getMockCallCluster = (hits: unknown[]) =>
    ({
      search: mockSearch as unknown,
    } as ElasticsearchClient);

  test('Returns undefined when no results found', async () => {
    mockSearch.mockResolvedValueOnce({ body: { hits: { hits: [] } } });
    const result = await getStats(getMockCallCluster(undefined as any), mockIndex);
    expect(result).toBeUndefined();
    expect(mockSearch).toHaveBeenCalledWith({
      size: 10000,
      index: mockIndex,
      ignoreUnavailable: true,
      filterPath: ['hits.hits._source.visualization'],
      body: {
        query: {
          bool: { filter: { term: { type: 'visualization' } } },
        },
      },
    });
  });

  test('Returns stats from saved objects for table vis only', async () => {
    mockSearch.mockResolvedValueOnce({ body: { hits: { hits: mockSavedObjects } } });
    const result = await getStats(getMockCallCluster(undefined as any), mockIndex);
    expect(result).toEqual({
      total: 4,
      total_split: 3,
      split_columns: {
        total: 1,
        enabled: 1,
      },
      split_rows: {
        total: 2,
        enabled: 1,
      },
    });
  });
});
