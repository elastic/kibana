/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger, ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  createRootWithCorePlugins,
} from '@kbn/core/test_helpers/kbn_server';
import { rollDailyData } from '../daily';
import { metricsServiceMock } from '@kbn/core/server/mocks';

import {
  SAVED_OBJECTS_DAILY_TYPE,
  serializeSavedObjectId,
  EventLoopDelaysDaily,
} from '../../saved_objects';
import moment from 'moment';

const eventLoopDelaysMonitor = metricsServiceMock.createEventLoopDelaysMonitor();

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

function createRawEventLoopDelaysDailyDocs(logger: Logger) {
  let edgeDocumentToKeep = 3;
  // If we are too close to midnight, let's reduce the age of the eldest document to keep.
  // Otherwise, the rollups may delete it.
  if (moment().endOf('day').diff(moment(), 'hour', true) < 1) {
    edgeDocumentToKeep--;
  }
  logger.info(`The oldest document to keep is ${edgeDocumentToKeep} days old.`);

  const rawEventLoopDelaysDaily = [
    createRawObject(moment.now()),
    createRawObject(moment.now()),
    createRawObject(moment().subtract(1, 'days')),
    createRawObject(moment().subtract(edgeDocumentToKeep, 'days')),
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

    // Create the docs now
    const rawDailyDocs = createRawEventLoopDelaysDailyDocs(logger);
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
