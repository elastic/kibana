/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerUpdateRoute } from '../update';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('PUT /api/saved_objects/{type}/{id?}', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  beforeEach(async () => {
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      type: 'logstash-type',
      attributes: {},
      timeFieldName: '@timestamp',
      notExpandable: true,
      references: [],
    };

    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.update.mockResolvedValue(clientResponse);

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsUpdate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerUpdateRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      type: 'logstash-type',
      timeFieldName: '@timestamp',
      notExpandable: true,
      attributes: {},
      references: [],
    };
    savedObjectsClient.update.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/index-pattern/logstash-*')
      .send({
        attributes: {
          title: 'Testing',
        },
        references: [],
      })
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsUpdate).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.update', async () => {
    await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/index-pattern/logstash-*')
      .send({
        attributes: { title: 'Testing' },
        version: 'foo',
      })
      .expect(200);

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'index-pattern',
      'logstash-*',
      { title: 'Testing' },
      { version: 'foo' }
    );
  });
});
