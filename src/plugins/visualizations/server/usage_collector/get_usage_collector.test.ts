/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';
import { ElasticsearchClient } from 'src/core/server';
import { getStats } from './get_usage_collector';

const defaultMockSavedObjects = [
  {
    _id: 'visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "shell_beads"}' },
      updated_at: moment().subtract(7, 'days').startOf('day').toString(),
    },
  },
];

const enlargedMockSavedObjects = [
  // default space
  {
    _id: 'visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "cave_painting"}' },
      updated_at: moment().subtract(7, 'days').startOf('day').toString(),
    },
  },
  {
    _id: 'visualization:coolviz-456',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "printing_press"}' },
      updated_at: moment().subtract(20, 'days').startOf('day').toString(),
    },
  },
  {
    _id: 'meat:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "floppy_disk"}' },
      updated_at: moment().subtract(2, 'months').startOf('day').toString(),
    },
  },
  // meat space
  {
    _id: 'meat:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "cave_painting"}' },
      updated_at: moment().subtract(89, 'days').startOf('day').toString(),
    },
  },
  {
    _id: 'meat:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "cuneiform"}' },
      updated_at: moment().subtract(5, 'months').startOf('day').toString(),
    },
  },
  {
    _id: 'meat:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "cuneiform"}' },
      updated_at: moment().subtract(2, 'days').startOf('day').toString(),
    },
  },
  {
    _id: 'meat:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "floppy_disk"}' },
      updated_at: moment().subtract(7, 'days').startOf('day').toString(),
    },
  },
  // cyber space
  {
    _id: 'cyber:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "floppy_disk"}' },
      updated_at: moment().subtract(7, 'months').startOf('day').toString(),
    },
  },
  {
    _id: 'cyber:visualization:coolviz-789',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "floppy_disk"}' },
      updated_at: moment().subtract(3, 'days').startOf('day').toString(),
    },
  },
  {
    _id: 'cyber:visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "cave_painting"}' },
      updated_at: moment().subtract(15, 'days').startOf('day').toString(),
    },
  },
];

describe('Visualizations usage collector', () => {
  const mockIndex = '';

  const getMockCallCluster = (hits: unknown[]) =>
    ({
      search: () => Promise.resolve({ body: { hits: { hits } } }) as unknown,
    } as ElasticsearchClient);

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(getMockCallCluster(undefined as any), mockIndex);
    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(getMockCallCluster([]), mockIndex);
    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const result = await getStats(getMockCallCluster(defaultMockSavedObjects), mockIndex);

    expect(result).toMatchObject({
      shell_beads: {
        spaces_avg: 1,
        spaces_max: 1,
        spaces_min: 1,
        total: 1,
        saved_7_days_total: 1,
        saved_30_days_total: 1,
        saved_90_days_total: 1,
      },
    });
  });

  test('Summarizes visualizations response data per Space', async () => {
    const expectedStats = {
      cave_painting: {
        total: 3,
        spaces_min: 1,
        spaces_max: 1,
        spaces_avg: 1,
        saved_7_days_total: 1,
        saved_30_days_total: 2,
        saved_90_days_total: 3,
      },
      printing_press: {
        total: 1,
        spaces_min: 1,
        spaces_max: 1,
        spaces_avg: 1,
        saved_7_days_total: 0,
        saved_30_days_total: 1,
        saved_90_days_total: 1,
      },
      cuneiform: {
        total: 2,
        spaces_min: 2,
        spaces_max: 2,
        spaces_avg: 2,
        saved_7_days_total: 1,
        saved_30_days_total: 1,
        saved_90_days_total: 1,
      },
      floppy_disk: {
        total: 4,
        spaces_min: 2,
        spaces_max: 2,
        spaces_avg: 2,
        saved_7_days_total: 2,
        saved_30_days_total: 2,
        saved_90_days_total: 3,
      },
    };

    const result = await getStats(getMockCallCluster(enlargedMockSavedObjects), mockIndex);

    expect(result).toMatchObject(expectedStats);
  });
});
