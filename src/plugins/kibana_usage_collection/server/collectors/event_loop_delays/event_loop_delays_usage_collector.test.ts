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
} from '../../../../usage_collection/server/mocks';
import { registerEventLoopDelaysCollector } from './event_loop_delays_usage_collector';
import { loggingSystemMock, savedObjectsRepositoryMock } from '../../../../../core/server/mocks';
const logger = loggingSystemMock.createLogger();

describe('registerEventLoopDelaysCollector', () => {
  let collector: Collector<unknown>;
  const mockRegisterType = jest.fn();
  const mockGetSavedObjectsClient = () => savedObjectsRepositoryMock.create();

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
    const mockFetch = jest.fn().mockResolvedValue({
      saved_objects: [{ attributes: { test: 1 } }],
    });
    collectorFetchContext.soClient.find = mockFetch;
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
    expect(mockFetch.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "sortField": "updated_at",
            "sortOrder": "desc",
            "type": "event_loop_delays_daily",
          },
        ],
      ]
    `);
  });
});
