/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerDeleteRoute } from '../delete';
import { savedObjectsClientMock } from '../../../mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('DELETE /api/saved_objects/{type}/{id}', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.getClient();
    handlerContext.savedObjects.getClient = jest.fn().mockImplementation(() => savedObjectsClient);

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsDelete.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerDeleteRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const result = await supertest(httpSetup.server.listener)
      .delete('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(result.body).toEqual({});
    expect(coreUsageStatsClient.incrementSavedObjectsDelete).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.delete', async () => {
    await supertest(httpSetup.server.listener)
      .delete('/api/saved_objects/index-pattern/logstash-*')
      .expect(200);

    expect(savedObjectsClient.delete).toHaveBeenCalledWith('index-pattern', 'logstash-*', {
      force: undefined,
    });
  });

  it('can specify `force` option', async () => {
    await supertest(httpSetup.server.listener)
      .delete('/api/saved_objects/index-pattern/logstash-*')
      .query({ force: true })
      .expect(200);

    expect(savedObjectsClient.delete).toHaveBeenCalledWith('index-pattern', 'logstash-*', {
      force: true,
    });
  });
});
