/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerBulkUpdateRoute } from '../bulk_update';
import { savedObjectsClientMock } from '../../../mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('PUT /api/saved_objects/_bulk_update', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkUpdate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerBulkUpdateRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const time = Date.now().toLocaleString();
    const clientResponse = [
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        references: undefined,
        attributes: {
          title: 'An existing visualization',
        },
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        updated_at: time,
        version: 'version',
        references: undefined,
        attributes: {
          title: 'An existing dashboard',
        },
      },
    ];
    savedObjectsClient.bulkUpdate.mockResolvedValue({ saved_objects: clientResponse });

    const result = await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);

    expect(result.body).toEqual({ saved_objects: clientResponse });
    expect(coreUsageStatsClient.incrementSavedObjectsBulkUpdate).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.bulkUpdate', async () => {
    savedObjectsClient.bulkUpdate.mockResolvedValue({ saved_objects: [] });

    await supertest(httpSetup.server.listener)
      .put('/api/saved_objects/_bulk_update')
      .send([
        {
          type: 'visualization',
          id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing visualization',
          },
        },
        {
          type: 'dashboard',
          id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
          attributes: {
            title: 'An existing dashboard',
          },
        },
      ])
      .expect(200);

    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
      {
        type: 'visualization',
        id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing visualization',
        },
      },
      {
        type: 'dashboard',
        id: 'be3733a0-9efe-11e7-acb3-3dab96693fab',
        attributes: {
          title: 'An existing dashboard',
        },
      },
    ]);
  });
});
