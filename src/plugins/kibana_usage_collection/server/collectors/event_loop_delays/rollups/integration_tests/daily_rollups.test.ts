/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment, { type MomentInput } from 'moment';
import type {
  Logger,
  ISavedObjectsRepository,
  SavedObject,
  ElasticsearchClient,
} from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

import { metricsServiceMock } from '@kbn/core/server/mocks';

import {
  SAVED_OBJECTS_DAILY_TYPE,
  serializeSavedObjectId,
  EventLoopDelaysDaily,
} from '../../saved_objects';
import { rollDailyData } from '../daily';

const eventLoopDelaysMonitor = metricsServiceMock.createEventLoopDelaysMonitor();

/*
 * Mocking the constructor of moment, so we can control the time of the day.
 * This is to avoid flaky tests when starting to run before midnight and ending the test after midnight
 * because the logic might remove one extra document since we moved to the next day.
 */
jest.doMock('moment', () => {
  const mockedMoment = (date?: MomentInput) => moment(date ?? '2023-07-04T10:00:00.000Z');
  Object.setPrototypeOf(mockedMoment, moment); // inherit the prototype of `moment` so it has all the same methods.
  return mockedMoment;
});

function createRawObject(date: moment.MomentInput): SavedObject<EventLoopDelaysDaily> {
  const pid = Math.round(Math.random() * 10000);
  const instanceUuid = 'mock_instance';

  return {
    type: SAVED_OBJECTS_DAILY_TYPE,
    id: serializeSavedObjectId({ pid, date, instanceUuid }),
    attributes: {
      ...eventLoopDelaysMonitor.collect(),
      fromTimestamp: moment(date).startOf('day').toISOString(),
      lastUpdatedAt: moment(date).toISOString(),
      processId: pid,
      instanceUuid,
    },
    references: [],
  };
}

function createRawEventLoopDelaysDailyDocs() {
  const rawEventLoopDelaysDaily = [
    createRawObject(moment()),
    createRawObject(moment()),
    createRawObject(moment().subtract(1, 'days')),
    createRawObject(moment().subtract(3, 'days')),
  ];

  const outdatedRawEventLoopDelaysDaily = [
    createRawObject(moment().subtract(5, 'days')),
    createRawObject(moment().subtract(7, 'days')),
  ];

  return { rawEventLoopDelaysDaily, outdatedRawEventLoopDelaysDaily };
}

describe(`daily rollups integration test`, () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let internalRepository: ISavedObjectsRepository;
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let rawEventLoopDelaysDaily: Array<SavedObject<EventLoopDelaysDaily>>;
  let outdatedRawEventLoopDelaysDaily: Array<SavedObject<EventLoopDelaysDaily>>;

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
    internalRepository = start.savedObjects.createInternalRepository([SAVED_OBJECTS_DAILY_TYPE]);
    esClient = start.elasticsearch.client.asInternalUser;

    // Create the docs now
    const rawDailyDocs = createRawEventLoopDelaysDailyDocs();
    rawEventLoopDelaysDaily = rawDailyDocs.rawEventLoopDelaysDaily;
    outdatedRawEventLoopDelaysDaily = rawDailyDocs.outdatedRawEventLoopDelaysDaily;

    await internalRepository.bulkCreate<EventLoopDelaysDaily>(
      [...rawEventLoopDelaysDaily, ...outdatedRawEventLoopDelaysDaily],
      { refresh: true }
    );
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  it('deletes documents older that 3 days from the saved objects repository', async () => {
    await rollDailyData(logger, internalRepository);
    await esClient.indices.refresh({ index: `.kibana` }); // Make sure that the changes are searchable
    const { total, saved_objects: savedObjects } =
      await internalRepository.find<EventLoopDelaysDaily>({ type: SAVED_OBJECTS_DAILY_TYPE });
    expect(total).toBe(rawEventLoopDelaysDaily.length);
    expect(
      savedObjects.map(({ id, type, attributes, references }) => ({
        id,
        type,
        attributes,
        references,
      }))
    ).toEqual(rawEventLoopDelaysDaily);
  });
});
