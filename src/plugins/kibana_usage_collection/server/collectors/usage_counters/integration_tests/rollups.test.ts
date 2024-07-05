/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { type MomentInput } from 'moment';
/*
 * Mocking the constructor of moment, so we can control the time of the day.
 * This is to avoid flaky tests when starting to run before midnight and ending the test after midnight
 * because the logic might remove one extra document since we moved to the next day.
 */
jest.doMock('moment', () => {
  const mockedMoment = (date?: MomentInput) => moment(date ?? '2024-06-30T10:00:00.000Z');
  Object.setPrototypeOf(mockedMoment, moment); // inherit the prototype of `moment` so it has all the same methods.
  return mockedMoment;
});

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

const ALL_COUNTERS = [
  'domain1:a:count:server:20240624:default',
  'domain1:a:count:server:20240626:default',
  'domain1:b:count:server:20240624:one',
  'domain1:b:count:server:20240624:two',
  'domain1:b:count:server:20240626:one',
  'domain1:b:count:server:20240626:two',
  'domain2:a:count:server:20240624:default',
  'domain2:a:count:server:20240626:default',
  'domain2:c:count:server:20240626:default',
];

const RECENT_COUNTERS = ALL_COUNTERS.filter((key) => key.includes('20240626'));

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
  });

  it('deletes documents older that the retention period, from all namespaces', async () => {
    // insert a bunch of usage counters in multiple namespaces
    const old = [
      createCounter('domain1', 'a', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1),
      createCounter('domain1', 'b', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1, 'one'),
      createCounter('domain1', 'b', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1, 'two'),
      createCounter('domain2', 'a', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS + 1),
    ];

    const recent = [
      createCounter('domain1', 'a', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1),
      createCounter('domain1', 'b', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1, 'one'),
      createCounter('domain1', 'b', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1, 'two'),
      createCounter('domain2', 'a', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1),
      createCounter('domain2', 'c', USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS - 1), // different counterName (does not have an old counterpart)
    ];

    getCurrentTimeMock.mockReturnValue('2024-06-24T10:00:00.000Z'); // 6 days old
    await Promise.all(old.map((counter) => incrementCounter(internalRepository, counter)));

    getCurrentTimeMock.mockReturnValue('2024-06-26T10:00:00.000Z'); // 4 days old
    await Promise.all(recent.map((counter) => incrementCounter(internalRepository, counter)));

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
    isSavedObjectOlderThanMock.mockImplementation(
      ({ doc }) => doc.updated_at === '2024-06-24T10:00:00.000Z'
    );
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

function createCounter(
  domainId: string,
  counterName: string,
  ageDays: number = 0,
  namespace?: string
): SavedObject<UsageCountersSavedObjectAttributes> {
  const date = moment('2024-06-30T10:00:00.000Z').subtract(ageDays, 'days');

  const id = serializeCounterKey({
    domainId,
    counterName,
    counterType: 'count',
    namespace,
    source: 'server',
    date,
  });
  return {
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    id,
    ...(namespace && { namespaces: [namespace] }),
    updated_at: date.format(), // illustrative purpose only, overriden by SOR
    attributes: {
      domainId,
      counterName,
      counterType: 'count',
      source: 'server',
      count: 28,
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
