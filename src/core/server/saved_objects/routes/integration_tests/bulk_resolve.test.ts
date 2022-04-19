/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerBulkResolveRoute } from '../bulk_resolve';
import { savedObjectsClientMock } from '../../../mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_bulk_resolve', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.bulkResolve.mockResolvedValue({
      resolved_objects: [],
    });
    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkResolve.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerBulkResolveRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      resolved_objects: [
        {
          saved_object: {
            id: 'abc123',
            type: 'index-pattern',
            title: 'logstash-*',
            version: 'foo',
            references: [],
            attributes: {},
          },
          outcome: 'exactMatch' as const,
        },
      ],
    };
    savedObjectsClient.bulkResolve.mockImplementation(() => Promise.resolve(clientResponse));

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsBulkResolve).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.bulkResolve', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_resolve')
      .send(docs)
      .expect(200);

    expect(savedObjectsClient.bulkResolve).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkResolve).toHaveBeenCalledWith(docs);
  });
});
