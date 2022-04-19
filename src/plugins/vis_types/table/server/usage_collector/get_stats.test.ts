/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_stats';
import type { SavedObjectsClientContract } from '@kbn/core/server';

const mockVisualizations = {
  saved_objects: [
    {
      attributes: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }, { "schema": "split", "enabled": true }], "params": { "row": true }}',
      },
    },
    {
      attributes: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }, { "schema": "split", "enabled": false }], "params": { "row": true }}',
      },
    },
    {
      attributes: {
        visState:
          '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "split", "enabled": true }], "params": { "row": false }}',
      },
    },
    {
      attributes: {
        visState: '{"type": "table","aggs": [{ "schema": "metric" }, { "schema": "bucket" }]}',
      },
    },
    {
      attributes: { visState: '{"type": "histogram"}' },
    },
  ],
};

describe('vis_type_table getStats', () => {
  const mockSoClient = {
    createPointInTimeFinder: jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield mockVisualizations;
      },
    }),
  } as unknown as SavedObjectsClientContract;

  test('Returns stats from saved objects for table vis only', async () => {
    const result = await getStats(mockSoClient);

    expect(mockSoClient.createPointInTimeFinder).toHaveBeenCalledWith({
      type: 'visualization',
      perPage: 1000,
      namespaces: ['*'],
    });

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
