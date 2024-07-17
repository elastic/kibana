/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { Logger, ISavedObjectsRepository, ElasticsearchClient } from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

jest.mock('../saved_objects', () => ({
  ...jest.requireActual('../saved_objects'),
  // used by `rollUsageCountersIndices` to determine if a counter is beyond the retention period
  isSavedObjectOlderThan: jest.fn(),
}));

import {
  isSavedObjectOlderThan,
  serializeCounterKey,
  UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from '../rollups/constants';
import type { GetUsageCounter } from '../types';
import { rollUsageCountersIndices } from '../rollups/rollups';
import { type CounterAttributes, createCounters, toCounterMetric } from './counter_utils';

const isSavedObjectOlderThanMock = isSavedObjectOlderThan as jest.MockedFunction<
  typeof isSavedObjectOlderThan
>;

const CUSTOM_RETENTION = 90;

const NOW = '2024-06-30T10:00:00.000Z';
const OLD = moment(NOW).subtract(USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1, 'days');
const RECENT = moment(NOW).subtract(USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1, 'days');
const OLD_YMD = OLD.format('YYYYMMDD');
const RECENT_YMD = RECENT.format('YYYYMMDD');
const OLD_ISO = OLD.toISOString();
const RECENT_ISO = RECENT.toISOString();

const CUSTOM_OLD = moment(NOW).subtract(CUSTOM_RETENTION + 1, 'days');
const CUSTOM_RECENT = moment(NOW).subtract(USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1, 'days');
const CUSTOM_OLD_YMD = CUSTOM_OLD.format('YYYYMMDD');
const CUSTOM_RECENT_YMD = CUSTOM_RECENT.format('YYYYMMDD');
const CUSTOM_OLD_ISO = CUSTOM_OLD.toISOString();
const CUSTOM_RECENT_ISO = CUSTOM_RECENT.toISOString();

const ALL_COUNTERS = [
  `testCounter|domain1:a:count:server:${OLD_YMD}`,
  `testCounter|domain2:a:count:server:${OLD_YMD}`,
  `one:testCounter|domain1:b:count:server:${OLD_YMD}`,
  `two:testCounter|domain1:b:count:server:${OLD_YMD}`,

  `testCounter|domain1:a:count:server:${RECENT_YMD}`,
  `testCounter|domain2:a:count:server:${RECENT_YMD}`,
  `testCounter|domain2:c:count:server:${RECENT_YMD}`,
  `one:testCounter|domain1:b:count:server:${RECENT_YMD}`,
  `two:testCounter|domain1:b:count:server:${RECENT_YMD}`,

  `testCounter|retention_${CUSTOM_RETENTION}:a:count:server:${CUSTOM_OLD_YMD}`,
  `testCounter|retention_${CUSTOM_RETENTION}:a:count:server:${CUSTOM_RECENT_YMD}`,
].sort();

const RECENT_COUNTERS = ALL_COUNTERS.filter(
  (key) => key.includes(RECENT_YMD) || key.includes(CUSTOM_RECENT_YMD)
);

describe('usage-counters', () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let usageCounters: GetUsageCounter;
  let internalRepository: ISavedObjectsRepository;
  let logger: Logger;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
    });

    esServer = await startES();
    root = createRootWithCorePlugins();

    usageCounters = {
      getUsageCounterByDomainId: jest.fn().mockImplementation((domainId: string) => {
        let retentionPeriodDays = USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS;
        if (domainId.startsWith('testCounter|retention_')) {
          const daysString = domainId.split('_').pop();
          retentionPeriodDays = Number(daysString!);
        }

        return {
          retentionPeriodDays,
          incrementCounter: jest.fn(),
        };
      }),
    };

    await root.preboot();
    await root.setup();
    const start = await root.start();

    logger = root.logger.get('test daily rollups');
    internalRepository = start.savedObjects.createInternalRepository([
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ]);

    // insert a bunch of usage counters in multiple namespaces
    await createTestCounters(internalRepository, start.elasticsearch.client.asInternalUser);
  });

  it('deletes documents older that the retention period, from all namespaces', async () => {
    // check that all documents are there
    const beforeRollup = await internalRepository.find<UsageCountersSavedObjectAttributes>({
      type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      namespaces: ['*'],
    });
    expect(
      beforeRollup.saved_objects
        .map(({ attributes, updated_at: updatedAt, namespaces }) =>
          serializeCounterKey({ ...attributes, date: updatedAt, namespace: namespaces?.[0] })
        )
        .filter((counterKey) => counterKey.includes('testCounter|'))
        .sort()
    ).toEqual(ALL_COUNTERS);

    isSavedObjectOlderThanMock.mockImplementation(({ doc, numberOfDays }) => {
      // here we ensure we have been called with the custom retention period
      if (numberOfDays === CUSTOM_RETENTION) {
        return doc.updated_at === CUSTOM_OLD_ISO;
      } else {
        return doc.updated_at === OLD_ISO;
      }
    });

    await rollUsageCountersIndices({ logger, usageCounters, internalRepository });

    // check only recent counters are present
    const afterRollup = await internalRepository.find<UsageCountersSavedObjectAttributes>({
      type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      namespaces: ['*'],
    });
    expect(
      afterRollup.saved_objects
        .map(({ attributes, updated_at: updatedAt, namespaces }) =>
          serializeCounterKey({ ...attributes, date: updatedAt, namespace: namespaces?.[0] })
        )
        .filter((counterKey) => counterKey.includes('testCounter|'))
        .sort()
    ).toEqual(RECENT_COUNTERS);
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });
});

const customOld: CounterAttributes[] = [
  // domainId, counterName, counterType, source, count, namespace?
  [`testCounter|retention_${CUSTOM_RETENTION}`, 'a', 'count', 'server', 198],
];
const customRecent: CounterAttributes[] = [
  [`testCounter|retention_${CUSTOM_RETENTION}`, 'a', 'count', 'server', 199],
];

const old: CounterAttributes[] = [
  ['testCounter|domain1', 'a', 'count', 'server', 28],
  ['testCounter|domain1', 'b', 'count', 'server', 29, 'one'],
  ['testCounter|domain1', 'b', 'count', 'server', 30, 'two'],
  ['testCounter|domain2', 'a', 'count', 'server', 31],
];

const recent: CounterAttributes[] = [
  // domainId, counterName, counterType, source, count, namespace?
  ['testCounter|domain1', 'a', 'count', 'server', 32],
  ['testCounter|domain1', 'b', 'count', 'server', 33, 'one'],
  ['testCounter|domain1', 'b', 'count', 'server', 34, 'two'],
  ['testCounter|domain2', 'a', 'count', 'server', 35],
  ['testCounter|domain2', 'c', 'count', 'server', 36],
];

async function createTestCounters(repo: ISavedObjectsRepository, client: ElasticsearchClient) {
  await createCounters(repo, client, CUSTOM_OLD_ISO, customOld.map(toCounterMetric));
  await createCounters(repo, client, CUSTOM_RECENT_ISO, customRecent.map(toCounterMetric));
  await createCounters(repo, client, OLD_ISO, old.map(toCounterMetric));
  await createCounters(repo, client, RECENT_ISO, recent.map(toCounterMetric));
}
