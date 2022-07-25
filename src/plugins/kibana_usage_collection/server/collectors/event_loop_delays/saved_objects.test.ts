/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  storeHistogram,
  serializeSavedObjectId,
  deleteHistogramSavedObjects,
} from './saved_objects';
import { savedObjectsRepositoryMock, metricsServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';

describe('serializeSavedObjectId', () => {
  it('returns serialized id', () => {
    const id = serializeSavedObjectId({ instanceUuid: 'mock_uuid', date: 1623233091278, pid: 123 });
    expect(id).toBe('mock_uuid::123::09062021');
  });
});

describe('storeHistogram', () => {
  const eventLoopDelaysMonitor = metricsServiceMock.createEventLoopDelaysMonitor();
  const mockInternalRepository = savedObjectsRepositoryMock.create();
  jest.useFakeTimers('modern');
  const mockNow = jest.getRealSystemTime();
  jest.setSystemTime(mockNow);

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  it('stores histogram data in a savedObject', async () => {
    const mockHistogram = eventLoopDelaysMonitor.collect();
    const instanceUuid = 'mock_uuid';
    await storeHistogram(mockHistogram, mockInternalRepository, instanceUuid);
    const pid = process.pid;
    const id = serializeSavedObjectId({ date: mockNow, pid, instanceUuid });

    expect(mockInternalRepository.create).toBeCalledWith(
      'event_loop_delays_daily',
      { ...mockHistogram, processId: pid, instanceUuid },
      { id, overwrite: true }
    );
  });
});

describe('deleteHistogramSavedObjects', () => {
  const mockInternalRepository = savedObjectsRepositoryMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockInternalRepository.find.mockResolvedValue({
      saved_objects: [{ id: 'test_obj_1' }, { id: 'test_obj_1' }],
    } as SavedObjectsFindResponse);
  });

  it('builds filter query based on time range passed in days', async () => {
    await deleteHistogramSavedObjects(mockInternalRepository);
    await deleteHistogramSavedObjects(mockInternalRepository, 20);
    expect(mockInternalRepository.find.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "filter": "event_loop_delays_daily.attributes.lastUpdatedAt < \\"now-3d/d\\"",
            "type": "event_loop_delays_daily",
          },
        ],
        Array [
          Object {
            "filter": "event_loop_delays_daily.attributes.lastUpdatedAt < \\"now-20d/d\\"",
            "type": "event_loop_delays_daily",
          },
        ],
      ]
    `);
  });

  it('loops over saved objects and deletes them', async () => {
    mockInternalRepository.delete.mockImplementation(async (type, id) => {
      return id;
    });

    const results = await deleteHistogramSavedObjects(mockInternalRepository);
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "status": "fulfilled",
          "value": "test_obj_1",
        },
        Object {
          "status": "fulfilled",
          "value": "test_obj_1",
        },
      ]
    `);
  });

  it('settles all promises even if some of the deletes fail.', async () => {
    mockInternalRepository.delete.mockImplementationOnce(async (type, id) => {
      throw new Error('Intentional failure');
    });
    mockInternalRepository.delete.mockImplementationOnce(async (type, id) => {
      return id;
    });

    const results = await deleteHistogramSavedObjects(mockInternalRepository);
    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "reason": [Error: Intentional failure],
          "status": "rejected",
        },
        Object {
          "status": "fulfilled",
          "value": "test_obj_1",
        },
      ]
    `);
  });
});
