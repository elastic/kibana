/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ElasticsearchClient,
  Logger,
  ISavedObjectsRepository,
} from '../../../../../../../core/server';
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
let esServer: TestElasticsearchUtils;

function createRawObject(pid: number, date: moment.MomentInput) {
  return {
    type: SAVED_OBJECTS_DAILY_TYPE,
    id: serializeSavedObjectId({ pid, date }),
    attributes: {
      ...mocked.createHistogram(),
      timestamp: moment(date).toISOString(),
      processId: pid,
    },
  };
}

const rawEventLoopDelaysDaily = [
  createRawObject(12351, moment.now()),
  createRawObject(9019, moment.now()),
  createRawObject(12351, moment().subtract(1, 'days')),
  createRawObject(12351, moment().subtract(3, 'days')),
  createRawObject(12351, moment().subtract(5, 'days')),
  createRawObject(12351, moment().subtract(1, 'weeks')),
];

describe('daily rollups integration test', () => {
  let root: TestKibanaUtils['root'];
  let client: ElasticsearchClient;
  let internalRepository: ISavedObjectsRepository;
  let logger: Logger;

  beforeAll(async () => {
    esServer = await startES();
    root = createRootWithCorePlugins({
      server: {
        basePath: '/daily_test',
      },
    });

    await root.setup();
    const start = await root.start();
    client = start.elasticsearch.client.asInternalUser;
    logger = root.logger.get('test dailt rollups');
    internalRepository = start.savedObjects.createInternalRepository();

    await internalRepository.bulkCreate<EventLoopDelaysDaily>(rawEventLoopDelaysDaily);
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
    expect(total).toBe(4);
    expect(savedObjects.map(({ id, type, attributes }) => ({ id, type, attributes }))).toEqual(
      rawEventLoopDelaysDaily.slice(0, 4)
    );
  });
});
