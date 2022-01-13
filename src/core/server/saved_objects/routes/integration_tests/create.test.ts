/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { registerCreateRoute } from '../create';
import { savedObjectsClientMock } from '../../service/saved_objects_client.mock';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('POST /api/saved_objects/{type}', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  const clientResponse = {
    id: 'logstash-*',
    type: 'index-pattern',
    title: 'logstash-*',
    version: 'foo',
    references: [],
    attributes: {},
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.create.mockImplementation(() => Promise.resolve(clientResponse));

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsCreate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerCreateRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsCreate).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('requires attributes', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern')
      .send({})
      .expect(400);

    // expect(response.validation.keys).toContain('attributes');
    expect(result.body.message).toMatchInlineSnapshot(
      `"[request body.attributes]: expected value of type [object] but got [undefined]"`
    );
  });

  it('calls upon savedObjectClient.create', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'index-pattern',
      { title: 'Testing' },
      { overwrite: false, id: undefined, migrationVersion: undefined }
    );
  });

  it('can specify an id', async () => {
    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/index-pattern/logstash-*')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);

    const args = savedObjectsClient.create.mock.calls[0];
    expect(args).toEqual([
      'index-pattern',
      { title: 'Testing' },
      { overwrite: false, id: 'logstash-*' },
    ]);
  });
});
