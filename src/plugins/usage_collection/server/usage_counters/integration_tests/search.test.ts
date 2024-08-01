/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { ISavedObjectsRepository, ElasticsearchClient } from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

import { serializeCounterKey, USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '../..';
import { type CounterAttributes, createCounters, toCounterMetric } from './counter_utils';
import type { UsageCounterSnapshot } from '../types';
import { searchUsageCounters } from '../search';
import { orderBy } from 'lodash';

// domainId, counterName, counterType, source, count, namespace?
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
  let internalRepository: ISavedObjectsRepository;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = createRootWithCorePlugins();

    await root.preboot();
    await root.setup();
    const start = await root.start();

    internalRepository = start.savedObjects.createInternalRepository([
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ]);

    await createTestCounters(internalRepository, start.elasticsearch.client.asInternalUser);
  });

  describe('namespace agnostic search', () => {
    it('returns counters in the default namespace', async () => {
      const dashboardsNoNamespace = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'dashboards',
        },
      });

      expect(
        dashboardsNoNamespace.counters.every(
          ({ domainId, namespace }) => domainId === 'dashboards' && namespace === 'default'
        )
      ).toEqual(true);

      expectToMatchKeys(dashboardsNoNamespace.counters, [
        'dashboards:list:viewed:ui - 513 hits',
        'dashboards:someGlobalServerCounter:count:server - 57 hits',
        'dashboards:someGlobalUiCounter:count:ui - 29 hits',
      ]);

      // check that the daily records are sorted descendingly
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
      const dashboardsFirstNamespace = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'dashboards',
          namespace: 'first',
        },
      });
      expect(
        dashboardsFirstNamespace.counters.every(
          ({ domainId, namespace }) => domainId === 'dashboards' && namespace === 'first'
        )
      ).toEqual(true);
      expectToMatchKeys(dashboardsFirstNamespace.counters, [
        'first:dashboards:aDashboardId:viewed:server - 21 hits',
        'first:dashboards:aDashboardId:edited:server - 11 hits',
        'first:dashboards:aDashboardId:consoleErrors:ui - 7 hits',
      ]);
    });

    it('does not return counters that belong to other namespaces', async () => {
      const someDomainSecondNamespace = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'someDomain',
          namespace: 'second',
        },
      });
      expect(someDomainSecondNamespace.counters).toEqual([]);
    });
  });

  describe('specific counter search', () => {
    it('allows searching for specific counters (name + type) on specific namespaces', async () => {
      const dashboardsByName = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'dashboards',
          counterName: 'aDashboardId',
          counterType: 'viewed',
          source: 'server',
          namespace: 'second',
        },
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
      expectToMatchKeys(dashboardsByName.counters, [
        'second:dashboards:aDashboardId:viewed:server - 201 hits',
      ]);
    });
  });

  describe('date filters', () => {
    it('allow searching for counters that are more recent than the given date', async () => {
      const from = moment('2024-07-03T00:00:00.000Z');
      const dashboardsFrom = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'dashboards',
          from: '2024-07-03T00:00:00.000Z',
        },
      });

      expect(
        dashboardsFrom.counters.every(
          ({ domainId, records }) =>
            domainId === 'dashboards' &&
            records.every(({ updatedAt }) => moment(updatedAt).diff(from) > 0)
        )
      ).toEqual(true);

      expectToMatchKeys(dashboardsFrom.counters, [
        'dashboards:someGlobalServerCounter:count:server - 29 hits',
        'dashboards:someGlobalUiCounter:count:ui - 15 hits',
      ]);
    });
  });

  describe('PIT search', () => {
    it('allows retrieving all counters in batches', async () => {
      const allDashboards = await searchUsageCounters(internalRepository, {
        filters: {
          domainId: 'dashboards',
          namespace: '*',
        },
        options: {
          // we are forcing the logic to perform lots of requests to ES
          // each of them retrieving just a single result, just for the sake of testing
          perPage: 1,
        },
      });

      expectToMatchKeys(allDashboards.counters, [
        'dashboards:list:viewed:ui - 513 hits',
        'second:dashboards:aDashboardId:viewed:server - 201 hits',
        'second:dashboards:aDashboardId:edited:server - 101 hits',
        'dashboards:someGlobalServerCounter:count:server - 57 hits',
        'dashboards:someGlobalUiCounter:count:ui - 29 hits',
        'first:dashboards:aDashboardId:viewed:server - 21 hits',
        'second:dashboards:aDashboardId:consoleErrors:ui - 19 hits',
        'first:dashboards:aDashboardId:edited:server - 11 hits',
        'first:dashboards:aDashboardId:consoleErrors:ui - 7 hits',
      ]);
    });
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });
});

async function createTestCounters(
  internalRepository: ISavedObjectsRepository,
  esClient: ElasticsearchClient
) {
  // insert a bunch of usage counters in multiple namespaces
  await createCounters(
    internalRepository,
    esClient,
    '2024-07-01T10:00:00.000Z',
    FIRST_DAY_COUNTERS.map(toCounterMetric)
  );
  await createCounters(
    internalRepository,
    esClient,
    '2024-07-02T10:00:00.000Z',
    SECOND_DAY_COUNTERS.map(toCounterMetric)
  );
  await createCounters(
    internalRepository,
    esClient,
    '2024-07-03T10:00:00.000Z',
    THIRD_DAY_COUNTERS.map(toCounterMetric)
  );
}

function expectToMatchKeys(counters: UsageCounterSnapshot[], keys: string[]) {
  expect(counters.length).toEqual(keys.length);

  // the counter snapshots do not include a single date. We match a date agnostic key
  expect(
    orderBy(
      counters.map((counter) => ({ ...counter, key: serializeCounterKey(counter) })),
      ['count', 'key'],
      ['desc', 'asc']
    ).map(({ key, count }) => `${key.substring(0, key.length - 9)} - ${count} hits`)
  ).toEqual(keys);
}
