/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

/**
 * Mocking methods that are used to retrieve current time. This allows:
 * 1) introducing OLD counters that can be rolled up
 * 2) Removing flakiness for tests that are executed on a 2 day span (close to midnight)
 * getCurrentTime => used by `SOR.incrementCounter` to determine 'updated_at'
 * isSavedObjectOlderThan => used by `rollUsageCountersIndices` to determine if a counter is beyond the retention period
 */
jest.mock('@kbn/core-saved-objects-api-server-internal/src/lib/apis/utils', () => ({
  ...jest.requireActual('@kbn/core-saved-objects-api-server-internal/src/lib/apis/utils'),
  getCurrentTime: jest.fn(),
}));

jest.mock('../../common/saved_objects', () => ({
  ...jest.requireActual('../../common/saved_objects'),
  isSavedObjectOlderThan: jest.fn(),
}));

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
} from '@kbn/usage-collection-plugin/server';
import { rollUsageCountersIndices } from '../rollups/rollups';
import { USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS } from '../rollups/constants';
import { isSavedObjectOlderThan } from '../../common/saved_objects';

const getCurrentTimeMock = getCurrentTime as jest.MockedFunction<typeof getCurrentTime>;
const isSavedObjectOlderThanMock = isSavedObjectOlderThan as jest.MockedFunction<
  typeof isSavedObjectOlderThan
>;

const NOW = '2024-06-30T10:00:00.000Z';
const OLD = moment(NOW).subtract(USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1, 'days');
const RECENT = moment(NOW).subtract(USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1, 'days');
const OLD_YMD = OLD.format('YYYYMMDD');
const RECENT_YMD = RECENT.format('YYYYMMDD');
const OLD_ISO = OLD.toISOString();
const RECENT_ISO = RECENT.toISOString();

const ALL_COUNTERS = [
  `domain1:a:count:server:${OLD_YMD}:default`,
  `domain1:a:count:server:${RECENT_YMD}:default`,
  `domain1:b:count:server:${OLD_YMD}:one`,
  `domain1:b:count:server:${OLD_YMD}:two`,
  `domain1:b:count:server:${RECENT_YMD}:one`,
  `domain1:b:count:server:${RECENT_YMD}:two`,
  `domain2:a:count:server:${OLD_YMD}:default`,
  `domain2:a:count:server:${RECENT_YMD}:default`,
  `domain2:c:count:server:${RECENT_YMD}:default`,
];

const RECENT_COUNTERS = ALL_COUNTERS.filter((key) => key.includes(RECENT_YMD));

describe('usage-counters', () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let internalRepository: ISavedObjectsRepository;
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
    internalRepository = start.savedObjects.createInternalRepository([
      USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ]);

    // insert a bunch of usage counters in multiple namespaces
    await createTestCounters(internalRepository);
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
        .sort()
    ).toEqual(ALL_COUNTERS);

    // run the rollup logic
    isSavedObjectOlderThanMock.mockImplementation(({ doc }) => doc.updated_at === OLD_ISO);
    await rollUsageCountersIndices(logger, internalRepository);

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
        .sort()
    ).toEqual(RECENT_COUNTERS);
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });
});

async function createTestCounters(internalRepository: ISavedObjectsRepository) {
  await createCounters(internalRepository, OLD_ISO, [
    // domainId, counterName, counterType, source, count, namespace?
    ['domain1', 'a', 'count', 'server', 28],
    ['domain1', 'b', 'count', 'server', 29, 'one'],
    ['domain1', 'b', 'count', 'server', 30, 'two'],
    ['domain2', 'a', 'count', 'server', 31],
  ]);

  await createCounters(internalRepository, RECENT_ISO, [
    // domainId, counterName, counterType, source, count, namespace?
    ['domain1', 'a', 'count', 'server', 32],
    ['domain1', 'b', 'count', 'server', 33, 'one'],
    ['domain1', 'b', 'count', 'server', 34, 'two'],
    ['domain2', 'a', 'count', 'server', 35],
    ['domain2', 'c', 'count', 'server', 36],
  ]);
}

// domainId, counterName, counterType, source, count, namespace?
type CounterAttributes = [string, string, string, 'ui' | 'server', number, string?];

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
