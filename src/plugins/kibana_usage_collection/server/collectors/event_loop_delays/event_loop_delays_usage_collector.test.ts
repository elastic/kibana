/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Collector,
  createUsageCollectionSetupMock,
  createCollectorFetchContextMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { registerEventLoopDelaysCollector } from './event_loop_delays_usage_collector';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';

const logger = loggingSystemMock.createLogger();

describe('registerEventLoopDelaysCollector', () => {
  let collector: Collector<unknown>;
  const mockRegisterType = jest.fn();
  const mockInternalRepository = savedObjectsRepositoryMock.create();
  const mockGetSavedObjectsClient = () => mockInternalRepository;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const collectorFetchContext = createCollectorFetchContextMock();

  beforeAll(() => {
    registerEventLoopDelaysCollector(
      logger,
      usageCollectionMock,
      mockRegisterType,
      mockGetSavedObjectsClient
    );
  });

  it('registers event_loop_delays collector', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('event_loop_delays');
  });

  it('registers savedObjectType "event_loop_delays_daily"', () => {
    expect(mockRegisterType).toBeCalledTimes(1);
    expect(mockRegisterType).toBeCalledWith(
      expect.objectContaining({
        name: 'event_loop_delays_daily',
      })
    );
  });

  it('returns objects from event_loop_delays_daily from fetch function', async () => {
    const mockFind = jest.fn().mockResolvedValue({
      saved_objects: [{ attributes: { test: 1 } }],
    } as unknown as SavedObjectsFindResponse);
    mockInternalRepository.find = mockFind;
    const fetchResult = await collector.fetch(collectorFetchContext);

    expect(fetchResult).toMatchInlineSnapshot(`
      Object {
        "daily": Array [
          Object {
            "test": 1,
          },
        ],
      }
    `);
    expect(mockFind).toBeCalledTimes(1);
    expect(mockFind.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "sortField": "updated_at",
          "sortOrder": "desc",
          "type": "event_loop_delays_daily",
        },
      ]
    `);
  });
});
