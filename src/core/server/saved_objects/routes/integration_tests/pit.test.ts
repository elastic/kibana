/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';

import { UnwrapPromise } from '@kbn/utility-types';
import { registerPointInTimeRoute } from '../pit';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/{type}/_pit', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  const clientResponse = {
    id: 'abc123',
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.openPointInTimeForType.mockResolvedValue(clientResponse);

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsOpenPit.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerPointInTimeRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('works without optional body settings', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/_pit')
      .expect(200);

    expect(result.body).toEqual(clientResponse);
  });

  it('records usage stats', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/_pit')
      .expect(200);

    expect(coreUsageStatsClient.incrementSavedObjectsOpenPit).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls savedObjectClient.openPointInTimeForType with the type', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/_pit')
      .expect(200);

    expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.openPointInTimeForType.mock.calls[0][0];
    expect(options).toEqual(['index-pattern']);
  });

  it('handles multiple comma-separated types in the path', async () => {
    await supertest(httpSetup.server.listener).post('/api/saved_objects/a,b,c/_pit').expect(200);

    expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.openPointInTimeForType.mock.calls[0][0];
    expect(options).toEqual(['a', 'b', 'c']);
  });

  it('accepts keep_alive in the body', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/_pit')
      .send({ keepAlive: '1m' })
      .expect(200);

    expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.openPointInTimeForType.mock.calls[0][1];
    expect(options).toEqual({ keepAlive: '1m' });
  });

  it('accepts preference in the body', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/_pit')
      .send({ preference: 'foo' })
      .expect(200);

    expect(savedObjectsClient.openPointInTimeForType).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.openPointInTimeForType.mock.calls[0][1];
    expect(options).toEqual({ preference: 'foo' });
  });
});
