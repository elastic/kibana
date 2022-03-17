/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerBulkCreateRoute } from '../bulk_create';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/_bulk_create', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.bulkCreate.mockResolvedValue({ saved_objects: [] });

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsBulkCreate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerBulkCreateRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const clientResponse = {
      saved_objects: [
        {
          id: 'abc123',
          type: 'index-pattern',
          title: 'logstash-*',
          attributes: {},
          version: '2',
          references: [],
        },
      ],
    };
    savedObjectsClient.bulkCreate.mockResolvedValue(clientResponse);

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send([
        {
          id: 'abc123',
          type: 'index-pattern',
          attributes: {
            title: 'my_title',
          },
        },
      ])
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsBulkCreate).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.bulkCreate', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
        attributes: {
          title: 'foo',
        },
        references: [],
      },
      {
        id: 'abc1234',
        type: 'index-pattern',
        attributes: {
          title: 'bar',
        },
        references: [],
      },
    ];

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create')
      .send(docs)
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[0]).toEqual(docs);
  });

  it('passes along the overwrite option', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_bulk_create?overwrite=true')
      .send([
        {
          id: 'abc1234',
          type: 'index-pattern',
          attributes: {
            title: 'foo',
          },
          references: [],
        },
      ])
      .expect(200);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[1]).toEqual({ overwrite: true });
  });
});
