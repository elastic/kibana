/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { getStats } from './get_usage_collector';
import type { SavedObjectsClientContract } from '@kbn/core/server';

const defaultMockSavedObjects = [
  {
    id: 'visualization:coolviz-123',
    attributes: { visState: '{"type": "shell_beads"}' },
    updated_at: moment().subtract(7, 'days').startOf('day').toString(),
  },
];

const enlargedMockSavedObjects = [
  // default space
  {
    id: 'visualization:coolviz-123',
    namespaces: ['default'],
    attributes: { visState: '{"type": "cave_painting"}' },
    updated_at: moment().subtract(7, 'days').startOf('day').toString(),
  },
  {
    id: 'visualization:coolviz-456',
    namespaces: ['default'],
    attributes: { visState: '{"type": "printing_press"}' },
    updated_at: moment().subtract(20, 'days').startOf('day').toString(),
  },
  {
    id: 'meat:visualization:coolviz-789',
    namespaces: ['default'],
    attributes: { visState: '{"type": "floppy_disk"}' },
    updated_at: moment().subtract(2, 'months').startOf('day').toString(),
  },
  // meat space
  {
    id: 'meat:visualization:coolviz-789',
    namespaces: ['meat'],
    attributes: { visState: '{"type": "cave_painting"}' },
    updated_at: moment().subtract(89, 'days').startOf('day').toString(),
  },
  {
    id: 'meat:visualization:coolviz-789',
    namespaces: ['meat'],
    attributes: { visState: '{"type": "cuneiform"}' },
    updated_at: moment().subtract(5, 'months').startOf('day').toString(),
  },
  {
    id: 'meat:visualization:coolviz-789',
    namespaces: ['meat'],
    attributes: { visState: '{"type": "cuneiform"}' },
    updated_at: moment().subtract(2, 'days').startOf('day').toString(),
  },
  {
    id: 'meat:visualization:coolviz-789',
    attributes: { visState: '{"type": "floppy_disk"}' },
    updated_at: moment().subtract(7, 'days').startOf('day').toString(),
  },
  // cyber space
  {
    id: 'cyber:visualization:coolviz-789',
    namespaces: ['cyber'],
    attributes: { visState: '{"type": "floppy_disk"}' },
    updated_at: moment().subtract(7, 'months').startOf('day').toString(),
  },
  {
    id: 'cyber:visualization:coolviz-789',
    namespaces: ['cyber'],
    attributes: { visState: '{"type": "floppy_disk"}' },
    updated_at: moment().subtract(3, 'days').startOf('day').toString(),
  },
  {
    id: 'cyber:visualization:coolviz-123',
    namespaces: ['cyber'],
    attributes: { visState: '{"type": "cave_painting"}' },
    updated_at: moment().subtract(15, 'days').startOf('day').toString(),
  },
];

describe('Visualizations usage collector', () => {
  const getMockCallCluster = (savedObjects: unknown[]) =>
    ({
      createPointInTimeFinder: jest.fn().mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: savedObjects };
        },
      }),
    } as unknown as SavedObjectsClientContract);

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(getMockCallCluster(undefined as any));

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(getMockCallCluster([]));
    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const result = await getStats(getMockCallCluster(defaultMockSavedObjects));

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

    const result = await getStats(getMockCallCluster(enlargedMockSavedObjects));

    expect(result).toMatchObject(expectedStats);
  });
});
