/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Mocking methods that are used to retrieve current time. This allows:
 * 1) introducing OLD counters that can be rolled up
 * getCurrentTime => used by `SOR.incrementCounter` to determine 'updated_at'
 */
jest.mock('@kbn/core-saved-objects-api-server-internal/src/lib/apis/utils', () => ({
  ...jest.requireActual('@kbn/core-saved-objects-api-server-internal/src/lib/apis/utils'),
  getCurrentTime: jest.fn(),
}));

import moment from 'moment';
import { getCurrentTime } from '@kbn/core-saved-objects-api-server-internal/src/lib/apis/utils';
import type { Logger, ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

import {
  serializeCounterKey,
  type UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '../..';
import { UsageCountersService } from '../usage_counters_service';
import type { UsageCounterSnapshot } from '../types';

const getCurrentTimeMock = getCurrentTime as jest.MockedFunction<typeof getCurrentTime>;

// domainId, counterName, counterType, source, count, namespace?
type CounterAttributes = [string, string, string, 'ui' | 'server', number, string?];

const FIRST_DAY_COUNTERS: CounterAttributes[] = [
  ['dashboards', 'aDashboardId', 'viewed', 'server', 10, 'first'],
  ['dashboards', 'aDashboardId', 'edited', 'server', 5, 'first'],
  ['dashboards', 'aDashboardId', 'viewed', 'server', 100, 'second'],
  ['dashboards', 'aDashboardId', 'edited', 'server', 50, 'second'],
  ['dashboards', 'aDashboardId', 'consoleErrors', 'ui', 3, 'first'],
  ['dashboards', 'aDashboardId', 'consoleErrors', 'ui', 9, 'second'],
  ['dashboards', 'list', 'viewed', 'ui', 256, 'default'],
  ['someDomain', 'someCounterName', 'someCounter', 'server', 13, 'first'],
];

const SECOND_DAY_COUNTERS: CounterAttributes[] = [
  ['dashboards', 'aDashboardId', 'viewed', 'server', 11, 'first'],
  ['dashboards', 'aDashboardId', 'edited', 'server', 6, 'first'],
  ['dashboards', 'aDashboardId', 'viewed', 'server', 101, 'second'],
  ['dashboards', 'aDashboardId', 'edited', 'server', 51, 'second'],
  ['dashboards', 'aDashboardId', 'consoleErrors', 'ui', 4, 'first'],
  ['dashboards', 'aDashboardId', 'consoleErrors', 'ui', 10, 'second'],
  ['dashboards', 'someGlobalServerCounter', 'count', 'server', 28],
  ['dashboards', 'someGlobalUiCounter', 'count', 'ui', 14],
  ['dashboards', 'list', 'viewed', 'ui', 257, 'default'],
  ['someDomain', 'someCounterName', 'someCounter', 'server', 14, 'first'],
];

const THIRD_DAY_COUNTERS: CounterAttributes[] = [
  ['dashboards', 'someGlobalServerCounter', 'count', 'server', 29],
  ['dashboards', 'someGlobalUiCounter', 'count', 'ui', 15],
  ['someDomain', 'someCounterName', 'someCounter', 'server', 15, 'first'],
];

describe('usage-counters#search', () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let usageCounters: UsageCountersService;
  let logger: Logger;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = createRootWithCorePlugins();

    await root.preboot();
    await root.setup();
    const start = await root.start();

    logger = root.logger.get('test daily rollups');
    const internalRepository = start.savedObjects.createInternalRepository([
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ]);

    await createTestCounters(internalRepository);

    usageCounters = new UsageCountersService({ logger, retryCount: 1, bufferDurationMs: 5000 });

    usageCounters.setup();
    usageCounters.start(start);
  });

  describe('namespace agnostic search', () => {
    it('returns counters in the default namespace', async () => {
      const dashboardsNoNamespace = await usageCounters.search({
        domainId: 'dashboards',
      });

      expect(
        dashboardsNoNamespace.counters.every(
          ({ domainId, namespace }) => domainId === 'dashboards' && namespace === 'default'
        )
      ).toEqual(true);
      expect(dashboardsNoNamespace.counters.map(counterKey).sort()).toMatchInlineSnapshot(`
        Array [
          "dashboards:list:viewed:ui:default",
          "dashboards:someGlobalServerCounter:count:server:default",
          "dashboards:someGlobalUiCounter:count:ui:default",
        ]
      `);
      expect(
        dashboardsNoNamespace.counters.find(
          ({ counterName }) => counterName === 'someGlobalUiCounter'
        )!.records
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "count": 15,
            "updatedAt": "2024-07-03T10:00:00.000Z",
          },
          Object {
            "count": 14,
            "updatedAt": "2024-07-02T10:00:00.000Z",
          },
        ]
      `);
    });
  });

  describe('namespace search', () => {
    it('returns all counters that match namespace', async () => {
      const dashboardsFirstNamespace = await usageCounters.search({
        domainId: 'dashboards',
        namespace: 'first',
      });
      expect(
        dashboardsFirstNamespace.counters.every(
          ({ domainId, namespace }) => domainId === 'dashboards' && namespace === 'first'
        )
      ).toEqual(true);
      expect(dashboardsFirstNamespace.counters.map(counterKey).sort()).toMatchInlineSnapshot(`
        Array [
          "dashboards:aDashboardId:consoleErrors:ui:first",
          "dashboards:aDashboardId:edited:server:first",
          "dashboards:aDashboardId:viewed:server:first",
        ]
      `);
      expect(
        dashboardsFirstNamespace.counters.find(({ counterType }) => counterType === 'edited')!
          .records
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "count": 6,
            "updatedAt": "2024-07-02T10:00:00.000Z",
          },
          Object {
            "count": 5,
            "updatedAt": "2024-07-01T10:00:00.000Z",
          },
        ]
      `);
    });

    it('does not return counters that belong to other namespaces', async () => {
      const someDomainSecondNamespace = await usageCounters.search({
        domainId: 'someDomain',
        namespace: 'second',
      });
      expect(someDomainSecondNamespace.counters).toEqual([]);
    });
  });

  describe('specific counter search', () => {
    it('allows searching for specific counters (name + type) on specific namespaces', async () => {
      const dashboardsByName = await usageCounters.search({
        domainId: 'dashboards',
        counterName: 'aDashboardId',
        counterType: 'viewed',
        source: 'server',
        namespace: 'second',
      });

      expect(
        dashboardsByName.counters.every(
          ({ domainId, counterName, counterType, source, namespace }) =>
            domainId === 'dashboards' &&
            counterName === 'aDashboardId' &&
            counterType === 'viewed' &&
            source === 'server' &&
            namespace === 'second'
        )
      ).toEqual(true);
      expect(dashboardsByName.counters.map(counterKey)).toMatchInlineSnapshot(`
        Array [
          "dashboards:aDashboardId:viewed:server:second",
        ]
      `);
      expect(dashboardsByName.counters[0].records).toMatchInlineSnapshot(`
        Array [
          Object {
            "count": 101,
            "updatedAt": "2024-07-02T10:00:00.000Z",
          },
          Object {
            "count": 100,
            "updatedAt": "2024-07-01T10:00:00.000Z",
          },
        ]
      `);
    });
  });

  describe('date filters', () => {
    it('allow searching for counters that are more recent than the given date', async () => {
      const from = moment('2024-07-03T00:00:00.000Z');
      const dashboardsFrom = await usageCounters.search({
        domainId: 'dashboards',
        from: '2024-07-03T00:00:00.000Z',
      });

      expect(
        dashboardsFrom.counters.every(
          ({ domainId, records }) =>
            domainId === 'dashboards' &&
            records.every(({ updatedAt }) => moment(updatedAt).diff(from) > 0)
        )
      ).toEqual(true);
      expect(dashboardsFrom.counters.map(counterKey).sort()).toMatchInlineSnapshot(`
        Array [
          "dashboards:someGlobalServerCounter:count:server:default",
          "dashboards:someGlobalUiCounter:count:ui:default",
        ]
      `);
      expect(dashboardsFrom.counters.find(({ source }) => source === 'ui')!.records)
        .toMatchInlineSnapshot(`
        Array [
          Object {
            "count": 15,
            "updatedAt": "2024-07-03T10:00:00.000Z",
          },
        ]
      `);
    });
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });
});

async function createTestCounters(internalRepository: ISavedObjectsRepository) {
  // insert a bunch of usage counters in multiple namespaces
  await createCounters(internalRepository, '2024-07-01T10:00:00.000Z', FIRST_DAY_COUNTERS);
  await createCounters(internalRepository, '2024-07-02T10:00:00.000Z', SECOND_DAY_COUNTERS);
  await createCounters(internalRepository, '2024-07-03T10:00:00.000Z', THIRD_DAY_COUNTERS);
}

async function createCounters(
  internalRepository: ISavedObjectsRepository,
  isoDate: string,
  countersAttributes: CounterAttributes[]
) {
  // tamper SO `updated_at`
  getCurrentTimeMock.mockReturnValue(isoDate);

  await Promise.all(
    countersAttributes
      .map((attrs) => createCounter(isoDate, ...attrs))
      .map((counter) => incrementCounter(internalRepository, counter))
  );
}

function createCounter(
  date: string,
  domainId: string,
  counterName: string,
  counterType: string,
  source: 'server' | 'ui',
  count: number,
  namespace?: string
): SavedObject<UsageCountersSavedObjectAttributes> {
  const id = serializeCounterKey({
    domainId,
    counterName,
    counterType,
    namespace,
    source,
    date,
  });
  return {
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    id,
    ...(namespace && { namespaces: [namespace] }),
    // updated_at: date // illustrative purpose only, overriden by SOR
    attributes: {
      domainId,
      counterName,
      counterType,
      source,
      count,
    },
    references: [],
  };
}

async function incrementCounter(
  internalRepository: ISavedObjectsRepository,
  counter: SavedObject<UsageCountersSavedObjectAttributes>
) {
  const namespace = counter.namespaces?.[0];
  return await internalRepository.incrementCounter(
    USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    counter.id,
    [{ fieldName: 'count', incrementBy: counter.attributes.count }],
    {
      ...(namespace && { namespace }),
      upsertAttributes: {
        domainId: counter.attributes.domainId,
        counterName: counter.attributes.counterName,
        counterType: counter.attributes.counterType,
        source: counter.attributes.source,
      },
    }
  );
}

function counterKey(counter: UsageCounterSnapshot): string {
  // e.g. 'dashboards:viewed:total:ui'          // namespace-agnostic counters
  // e.g. 'dashboards:viewed:total:ui:default'  // namespaced counters
  const { domainId, counterName, counterType, source, namespace } = counter;
  const namespaceSuffix = namespace ? `:${namespace}` : '';
  return `${domainId}:${counterName}:${counterType}:${source}${namespaceSuffix}`;
}
