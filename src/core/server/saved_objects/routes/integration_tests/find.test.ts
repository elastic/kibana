/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import querystring from 'querystring';

import { registerFindRoute } from '../find';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { setupServer } from '../test_utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe('GET /api/saved_objects/_find', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

  const clientResponse = {
    total: 0,
    saved_objects: [],
    per_page: 0,
    page: 0,
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;

    savedObjectsClient.find.mockResolvedValue(clientResponse);

    const router = httpSetup.createRouter('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsFind.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerFindRoute(router, { coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('returns with status 400 when type is missing', async () => {
    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find')
      .expect(400);

    expect(result.body.message).toContain(
      '[request query.type]: expected at least one defined value'
    );
  });

  it('formats successful response and records usage stats', async () => {
    const findResponse = {
      total: 2,
      per_page: 2,
      page: 1,
      saved_objects: [
        {
          type: 'index-pattern',
          id: 'logstash-*',
          title: 'logstash-*',
          timeFieldName: '@timestamp',
          notExpandable: true,
          attributes: {},
          score: 1,
          references: [],
          namespaces: ['default'],
        },
        {
          type: 'index-pattern',
          id: 'stocks-*',
          title: 'stocks-*',
          timeFieldName: '@timestamp',
          notExpandable: true,
          attributes: {},
          score: 1,
          references: [],
          namespaces: ['default'],
        },
      ],
    };
    savedObjectsClient.find.mockResolvedValue(findResponse);

    const result = await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern')
      .expect(200);

    expect(result.body).toEqual(findResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsFind).toHaveBeenCalledWith({
      request: expect.anything(),
    });
  });

  it('calls upon savedObjectClient.find with defaults', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&type=bar')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['foo', 'bar'],
      defaultSearchOperator: 'OR',
      hasReferenceOperator: 'OR',
    });
  });

  it('accepts the query parameter page/per_page', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&per_page=10&page=50')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(expect.objectContaining({ perPage: 10, page: 50 }));
  });

  it('accepts the optional query parameter has_reference', async () => {
    await supertest(httpSetup.server.listener).get('/api/saved_objects/_find?type=foo').expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options.hasReference).toBe(undefined);
  });

  it('accepts the query parameter has_reference as an object', async () => {
    const references = querystring.escape(
      JSON.stringify({
        id: '1',
        type: 'reference',
      })
    );
    await supertest(httpSetup.server.listener)
      .get(`/api/saved_objects/_find?type=foo&has_reference=${references}`)
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options.hasReference).toEqual({
      id: '1',
      type: 'reference',
    });
  });

  it('accepts the query parameter has_reference as an array', async () => {
    const references = querystring.escape(
      JSON.stringify([
        {
          id: '1',
          type: 'reference',
        },
        {
          id: '2',
          type: 'reference',
        },
      ])
    );
    await supertest(httpSetup.server.listener)
      .get(`/api/saved_objects/_find?type=foo&has_reference=${references}`)
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options.hasReference).toEqual([
      {
        id: '1',
        type: 'reference',
      },
      {
        id: '2',
        type: 'reference',
      },
    ]);
  });

  it('accepts the query parameter has_reference_operator', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&has_reference_operator=AND')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        hasReferenceOperator: 'AND',
      })
    );
  });

  it('accepts the query parameter search_fields', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&search_fields=title')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        searchFields: ['title'],
      })
    );
  });

  it('accepts the query parameter fields as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&fields=title')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        fields: ['title'],
      })
    );
  });

  it('accepts the query parameter fields as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&fields=title&fields=description')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        fields: ['title', 'description'],
      })
    );
  });

  it('accepts the query parameter type as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        type: ['index-pattern'],
      })
    );
  });

  it('accepts the query parameter type as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&type=visualization')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        type: ['index-pattern', 'visualization'],
      })
    );
  });

  it('accepts the query parameter namespaces as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&namespaces=foo')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        namespaces: ['foo'],
      })
    );
  });

  it('accepts the query parameter namespaces as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&namespaces=default&namespaces=foo')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual(
      expect.objectContaining({
        namespaces: ['default', 'foo'],
      })
    );
  });
});
