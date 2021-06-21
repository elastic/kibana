/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger, ISavedObjectsRepository } from '../../../../../../../core/server';
import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
  createRootWithCorePlugins,
} from '../../../../../../../core/test_helpers/kbn_server';
import { rollDailyData } from '../daily';
import { mocked } from '../../event_loop_delays.mocks';

import {
  SAVED_OBJECTS_DAILY_TYPE,
  serializeSavedObjectId,
  EventLoopDelaysDaily,
} from '../../saved_objects';
import moment from 'moment';

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});

function createRawObject(date: moment.MomentInput) {
  const pid = Math.round(Math.random() * 10000);
  return {
    type: SAVED_OBJECTS_DAILY_TYPE,
    id: serializeSavedObjectId({ pid, date }),
    attributes: {
      ...mocked.createHistogram({
        fromTimestamp: moment(date).startOf('day').toISOString(),
        lastUpdatedAt: moment(date).toISOString(),
      }),
      processId: pid,
    },
  };
}

const rawEventLoopDelaysDaily = [
  createRawObject(moment.now()),
  createRawObject(moment.now()),
  createRawObject(moment().subtract(1, 'days')),
  createRawObject(moment().subtract(3, 'days')),
];

const outdatedRawEventLoopDelaysDaily = [
  createRawObject(moment().subtract(5, 'days')),
  createRawObject(moment().subtract(7, 'days')),
];

describe('daily rollups integration test', () => {
  let esServer: TestElasticsearchUtils;
  let root: TestKibanaUtils['root'];
  let internalRepository: ISavedObjectsRepository;
  let logger: Logger;

  beforeAll(async () => {
    esServer = await startES();
    root = createRootWithCorePlugins();

    await root.setup();
    const start = await root.start();
    logger = root.logger.get('test dailt rollups');
    internalRepository = start.savedObjects.createInternalRepository([SAVED_OBJECTS_DAILY_TYPE]);

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
    const {
      total,
      saved_objects: savedObjects,
    } = await internalRepository.find<EventLoopDelaysDaily>({ type: SAVED_OBJECTS_DAILY_TYPE });
    expect(total).toBe(rawEventLoopDelaysDaily.length);
    expect(savedObjects.map(({ id, type, attributes }) => ({ id, type, attributes }))).toEqual(
      rawEventLoopDelaysDaily
    );
  });
});
