/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { noop } from 'lodash';
import { Collector } from './collector';
import { CollectorSet } from './collector_set';
import { UsageCollector } from './usage_collector';

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  httpServerMock,
} from '../../../../core/server/mocks';

describe('CollectorSet', () => {
  const logger = loggingSystemMock.createLogger();

  const loggerSpies = {
    debug: jest.spyOn(logger, 'debug'),
    warn: jest.spyOn(logger, 'warn'),
  };

  describe('registers a collector set and runs lifecycle events', () => {
    let fetch: Function;
    beforeEach(() => {
      fetch = noop;
      loggerSpies.debug.mockRestore();
      loggerSpies.warn.mockRestore();
    });
    const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const mockSoClient = savedObjectsClientMock.create();
    const req = void 0; // No need to instantiate any KibanaRequest in these tests

    it('should throw an error if non-Collector type of object is registered', () => {
      const collectors = new CollectorSet({ logger });
      const registerPojo = () => {
        collectors.registerCollector({
          type: 'type_collector_test',
          // @ts-expect-error we are intentionally sending it wrong.
          fetch,
        });
      };

      expect(registerPojo).toThrowError(
        'CollectorSet can only have Collector instances registered'
      );
    });

    it('should throw when 2 collectors with the same type are registered', () => {
      const collectorSet = new CollectorSet({ logger });
      collectorSet.registerCollector(
        new Collector(logger, { type: 'test_duplicated', fetch: () => 1, isReady: () => true })
      );
      expect(() =>
        collectorSet.registerCollector(
          // Even for Collector vs. UsageCollector
          new UsageCollector(logger, {
            type: 'test_duplicated',
            fetch: () => ({ prop: 2 }),
            isReady: () => false,
            schema: { prop: { type: 'long' } },
          })
        )
      ).toThrowError(`Usage collector's type "test_duplicated" is duplicated.`);
    });

    it('should log debug status of fetching from the collector', async () => {
      // @ts-expect-error we are just mocking the output of any call
      mockEsClient.ping.mockResolvedValue({ passTest: 1000 });
      const collectors = new CollectorSet({ logger });
      collectors.registerCollector(
        new Collector(logger, {
          type: 'MY_TEST_COLLECTOR',
          fetch: (collectorFetchContext) => {
            return collectorFetchContext.esClient.ping();
          },
          isReady: () => true,
        })
      );

      const result = await collectors.bulkFetch(mockEsClient, mockSoClient, req);
      expect(loggerSpies.debug).toHaveBeenCalledTimes(2);
      expect(loggerSpies.debug).toHaveBeenCalledWith('Getting ready collectors');
      expect(loggerSpies.debug).toHaveBeenCalledWith(
        'Fetching data from MY_TEST_COLLECTOR collector'
      );
      expect(result).toStrictEqual([
        {
          type: 'MY_TEST_COLLECTOR',
          result: { passTest: 1000 },
        },
        {
          type: 'usage_collector_stats',
          result: {
            not_ready: { count: 0, names: [] },
            not_ready_timeout: { count: 0, names: [] },
            succeeded: { count: 1, names: ['MY_TEST_COLLECTOR'] },
            failed: { count: 0, names: [] },
          },
        },
      ]);
    });

    it('should gracefully handle a collector fetch method throwing an error', async () => {
      const collectors = new CollectorSet({ logger });
      collectors.registerCollector(
        new Collector(logger, {
          type: 'MY_TEST_COLLECTOR',
          fetch: () => new Promise((_resolve, reject) => reject()),
          isReady: () => true,
        })
      );

      let result;
      try {
        result = await collectors.bulkFetch(mockEsClient, mockSoClient, req);
      } catch (err) {
        // Do nothing
      }
      // This must return an empty object instead of null/undefined
      expect(result).toStrictEqual([
        {
          type: 'usage_collector_stats',
          result: {
            not_ready: { count: 0, names: [] },
            not_ready_timeout: { count: 0, names: [] },
            succeeded: { count: 0, names: [] },
            failed: { count: 1, names: ['MY_TEST_COLLECTOR'] },
          },
        },
      ]);
    });

    it('should not break if isReady is not a function', async () => {
      const collectors = new CollectorSet({ logger });
      collectors.registerCollector(
        new Collector(logger, {
          type: 'MY_TEST_COLLECTOR',
          fetch: () => ({ test: 1 }),
          // @ts-expect-error we are intentionally sending it wrong
          isReady: true,
        })
      );

      const result = await collectors.bulkFetch(mockEsClient, mockSoClient, req);
      expect(result).toStrictEqual([
        {
          type: 'MY_TEST_COLLECTOR',
          result: { test: 1 },
        },
        {
          type: 'usage_collector_stats',
          result: {
            not_ready: { count: 0, names: [] },
            not_ready_timeout: { count: 0, names: [] },
            succeeded: { count: 1, names: ['MY_TEST_COLLECTOR'] },
            failed: { count: 0, names: [] },
          },
        },
      ]);
    });

    it('should not break if isReady is not provided', async () => {
      const collectors = new CollectorSet({ logger });
      collectors.registerCollector(
        // @ts-expect-error we are intentionally sending it wrong.
        new Collector(logger, {
          type: 'MY_TEST_COLLECTOR',
          fetch: () => ({ test: 1 }),
        })
      );

      const result = await collectors.bulkFetch(mockEsClient, mockSoClient, req);
      expect(result).toStrictEqual([
        {
          type: 'MY_TEST_COLLECTOR',
          result: { test: 1 },
        },
        {
          type: 'usage_collector_stats',
          result: {
            not_ready: { count: 0, names: [] },
            not_ready_timeout: { count: 0, names: [] },
            succeeded: { count: 1, names: ['MY_TEST_COLLECTOR'] },
            failed: { count: 0, names: [] },
          },
        },
      ]);
    });
  });

  describe('toApiFieldNames', () => {
    let collectorSet: CollectorSet;

    beforeEach(() => {
      collectorSet = new CollectorSet({ logger });
    });

    it('should snake_case and convert field names to api standards', () => {
      const apiData = {
        os: {
          load: {
            '15m': 2.3525390625,
            '1m': 2.22412109375,
            '5m': 2.4462890625,
          },
          memory: {
            free_in_bytes: 458280960,
            total_in_bytes: 17179869184,
            used_in_bytes: 16721588224,
          },
          uptime_in_millis: 137844000,
        },
        daysOfTheWeek: ['monday', 'tuesday', 'wednesday'],
      };

      const result = collectorSet.toApiFieldNames(apiData);
      expect(result).toStrictEqual({
        os: {
          load: { '15m': 2.3525390625, '1m': 2.22412109375, '5m': 2.4462890625 },
          memory: { free_bytes: 458280960, total_bytes: 17179869184, used_bytes: 16721588224 },
          uptime_ms: 137844000,
        },
        days_of_the_week: ['monday', 'tuesday', 'wednesday'],
      });
    });

    it('should correct object key fields nested in arrays', () => {
      const apiData = {
        daysOfTheWeek: [
          {
            dayName: 'monday',
            dayIndex: 1,
          },
          {
            dayName: 'tuesday',
            dayIndex: 2,
          },
          {
            dayName: 'wednesday',
            dayIndex: 3,
          },
        ],
      };

      const result = collectorSet.toApiFieldNames(apiData);
      expect(result).toStrictEqual({
        days_of_the_week: [
          { day_index: 1, day_name: 'monday' },
          { day_index: 2, day_name: 'tuesday' },
          { day_index: 3, day_name: 'wednesday' },
        ],
      });
    });
  });

  describe('makeStatsCollector', () => {
    const collectorSet = new CollectorSet({ logger });
    test('TS should hide kibanaRequest when not opted-in', () => {
      collectorSet.makeStatsCollector({
        type: 'MY_TEST_COLLECTOR',
        isReady: () => true,
        schema: { test: { type: 'long' } },
        fetch: (ctx) => {
          // @ts-expect-error
          const { kibanaRequest } = ctx;
          return { test: kibanaRequest ? 1 : 0 };
        },
      });
    });

    test('TS should hide kibanaRequest when not opted-in (explicit false)', () => {
      collectorSet.makeStatsCollector({
        type: 'MY_TEST_COLLECTOR',
        isReady: () => true,
        schema: { test: { type: 'long' } },
        fetch: (ctx) => {
          // @ts-expect-error
          const { kibanaRequest } = ctx;
          return { test: kibanaRequest ? 1 : 0 };
        },
        extendFetchContext: {
          kibanaRequest: false,
        },
      });
    });

    test('TS should allow using kibanaRequest when opted-in (explicit true)', () => {
      collectorSet.makeStatsCollector({
        type: 'MY_TEST_COLLECTOR',
        isReady: () => true,
        schema: { test: { type: 'long' } },
        fetch: (ctx) => {
          const { kibanaRequest } = ctx;
          return { test: kibanaRequest ? 1 : 0 };
        },
        extendFetchContext: {
          kibanaRequest: true,
        },
      });
    });

    test('fetch can use the logger (TS allows it)', () => {
      const collector = collectorSet.makeStatsCollector({
        type: 'MY_TEST_COLLECTOR',
        isReady: () => true,
        schema: { test: { type: 'long' } },
        fetch() {
          this.log.info("I can use the Collector's class logger!");
          return { test: 1 };
        },
      });
      expect(
        collector.fetch(
          // @ts-expect-error: the test implementation is not using it
          {}
        )
      ).toStrictEqual({ test: 1 });
    });
  });

  describe('makeUsageCollector', () => {
    const collectorSet = new CollectorSet({ logger });
    describe('TS validations', () => {
      describe('when types are inferred', () => {
        test('TS should hide kibanaRequest when not opted-in', () => {
          collectorSet.makeUsageCollector({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
          });
        });

        test('TS should hide kibanaRequest when not opted-in (explicit false)', () => {
          collectorSet.makeUsageCollector({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              kibanaRequest: false,
            },
          });
        });

        test('TS should allow using kibanaRequest when opted-in (explicit true)', () => {
          collectorSet.makeUsageCollector({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              kibanaRequest: true,
            },
          });
        });
      });

      describe('when types are explicit', () => {
        test('TS should hide `kibanaRequest` from ctx when undefined or false', () => {
          collectorSet.makeUsageCollector<{ test: number }>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, false>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              kibanaRequest: false,
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, false>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
          });
        });
        test('TS should not allow `true` when types declare false', () => {
          // false is the default when at least 1 type is specified
          collectorSet.makeUsageCollector<{ test: number }>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              // @ts-expect-error
              kibanaRequest: true,
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, false>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              // @ts-expect-error
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              // @ts-expect-error
              kibanaRequest: true,
            },
          });
        });

        test('TS should allow `true` when types explicitly declare `true` and do not allow `false` or undefined', () => {
          // false is the default when at least 1 type is specified
          collectorSet.makeUsageCollector<{ test: number }, true>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              kibanaRequest: true,
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, true>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              // @ts-expect-error
              kibanaRequest: false,
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, true>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            extendFetchContext: {
              // @ts-expect-error
              kibanaRequest: undefined,
            },
          });
          collectorSet.makeUsageCollector<{ test: number }, true>({
            type: 'MY_TEST_COLLECTOR',
            isReady: () => true,
            schema: { test: { type: 'long' } },
            fetch: (ctx) => {
              const { kibanaRequest } = ctx;
              return { test: kibanaRequest ? 1 : 0 };
            },
            // @ts-expect-error
            extendFetchContext: {},
          });
          collectorSet.makeUsageCollector<{ test: number }, true>(
            // @ts-expect-error
            {
              type: 'MY_TEST_COLLECTOR',
              isReady: () => true,
              schema: { test: { type: 'long' } },
              fetch: (ctx) => {
                const { kibanaRequest } = ctx;
                return { test: kibanaRequest ? 1 : 0 };
              },
            }
          );
        });
      });
    });

    test('fetch can use the logger (TS allows it)', () => {
      const collector = collectorSet.makeUsageCollector({
        type: 'MY_TEST_COLLECTOR',
        isReady: () => true,
        schema: { test: { type: 'long' } },
        fetch() {
          this.log.info("I can use the Collector's class logger!");
          return { test: 1 };
        },
      });
      expect(
        collector.fetch(
          // @ts-expect-error: the test implementation is not using it
          {}
        )
      ).toStrictEqual({ test: 1 });
    });
  });

  describe('bulkFetch', () => {
    const collectorSetConfig = { logger, maximumWaitTimeForAllCollectorsInS: 1 };
    let collectorSet = new CollectorSet(collectorSetConfig);
    afterEach(() => {
      collectorSet = new CollectorSet(collectorSetConfig);
    });

    it('skips collectors that are not ready', async () => {
      const mockIsReady = jest.fn().mockReturnValue(true);
      const mockIsNotReady = jest.fn().mockResolvedValue(false);
      const mockNonReadyFetch = jest.fn().mockResolvedValue({});
      const mockReadyFetch = jest.fn().mockResolvedValue({});
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'ready_col',
          isReady: mockIsReady,
          schema: {},
          fetch: mockReadyFetch,
        })
      );
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'not_ready_col',
          isReady: mockIsNotReady,
          schema: {},
          fetch: mockNonReadyFetch,
        })
      );

      const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const mockSoClient = savedObjectsClientMock.create();
      const results = await collectorSet.bulkFetch(mockEsClient, mockSoClient, undefined);

      expect(mockIsReady).toBeCalledTimes(1);
      expect(mockReadyFetch).toBeCalledTimes(1);
      expect(mockIsNotReady).toBeCalledTimes(1);
      expect(mockNonReadyFetch).toBeCalledTimes(0);

      expect(results).toMatchInlineSnapshot(`
        Array [
          Object {
            "result": Object {},
            "type": "ready_col",
          },
          Object {
            "result": Object {
              "failed": Object {
                "count": 0,
                "names": Array [],
              },
              "not_ready": Object {
                "count": 1,
                "names": Array [
                  "not_ready_col",
                ],
              },
              "not_ready_timeout": Object {
                "count": 0,
                "names": Array [],
              },
              "succeeded": Object {
                "count": 1,
                "names": Array [
                  "ready_col",
                ],
              },
            },
            "type": "usage_collector_stats",
          },
        ]
      `);
    });

    it('skips collectors that have timed out', async () => {
      const mockFastReady = jest.fn().mockImplementation(async () => {
        return new Promise((res) => {
          setTimeout(() => res(true), 0.5 * 1000);
        });
      });
      const mockTimedOutReady = jest.fn().mockImplementation(async () => {
        return new Promise((res) => {
          setTimeout(() => res(true), 2 * 1000);
        });
      });
      const mockNonReadyFetch = jest.fn().mockResolvedValue({});
      const mockReadyFetch = jest.fn().mockResolvedValue({});
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'ready_col',
          isReady: mockFastReady,
          schema: {},
          fetch: mockReadyFetch,
        })
      );
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'timeout_col',
          isReady: mockTimedOutReady,
          schema: {},
          fetch: mockNonReadyFetch,
        })
      );

      const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const mockSoClient = savedObjectsClientMock.create();
      const results = await collectorSet.bulkFetch(mockEsClient, mockSoClient, undefined);

      expect(mockFastReady).toBeCalledTimes(1);
      expect(mockReadyFetch).toBeCalledTimes(1);
      expect(mockTimedOutReady).toBeCalledTimes(1);
      expect(mockNonReadyFetch).toBeCalledTimes(0);

      expect(results).toMatchInlineSnapshot(`
        Array [
          Object {
            "result": Object {},
            "type": "ready_col",
          },
          Object {
            "result": Object {
              "failed": Object {
                "count": 0,
                "names": Array [],
              },
              "not_ready": Object {
                "count": 0,
                "names": Array [],
              },
              "not_ready_timeout": Object {
                "count": 1,
                "names": Array [
                  "timeout_col",
                ],
              },
              "succeeded": Object {
                "count": 1,
                "names": Array [
                  "ready_col",
                ],
              },
            },
            "type": "usage_collector_stats",
          },
        ]
      `);
    });

    it('passes context to fetch', async () => {
      const mockReadyFetch = jest.fn().mockResolvedValue({});
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'ready_col',
          isReady: () => true,
          schema: {},
          fetch: mockReadyFetch,
        })
      );

      const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const mockSoClient = savedObjectsClientMock.create();
      const results = await collectorSet.bulkFetch(mockEsClient, mockSoClient, undefined);

      expect(mockReadyFetch).toBeCalledTimes(1);
      expect(mockReadyFetch).toBeCalledWith({
        esClient: mockEsClient,
        soClient: mockSoClient,
      });
      expect(results).toHaveLength(2);
    });

    it('adds extra context to collectors with extendFetchContext config', async () => {
      const mockReadyFetch = jest.fn().mockResolvedValue({});
      collectorSet.registerCollector(
        collectorSet.makeUsageCollector({
          type: 'ready_col',
          isReady: () => true,
          schema: {},
          fetch: mockReadyFetch,
          extendFetchContext: { kibanaRequest: true },
        })
      );

      const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const mockSoClient = savedObjectsClientMock.create();
      const request = httpServerMock.createKibanaRequest();
      const results = await collectorSet.bulkFetch(mockEsClient, mockSoClient, request);

      expect(mockReadyFetch).toBeCalledTimes(1);
      expect(mockReadyFetch).toBeCalledWith({
        esClient: mockEsClient,
        soClient: mockSoClient,
        kibanaRequest: request,
      });
      expect(results).toHaveLength(2);
    });
  });
});
