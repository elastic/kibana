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
