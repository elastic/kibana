/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import supertest from 'supertest';
import querystring from 'querystring';

import { UnwrapPromise } from '@kbn/utility-types';
import { registerFindRoute } from '../find';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { setupServer } from '../test_utils';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('GET /api/saved_objects/_find', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let handlerContext: setupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

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
    registerFindRoute(router);

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

  it('formats successful response', async () => {
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
    });
  });

  it('accepts the query parameter page/per_page', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&per_page=10&page=50')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({ perPage: 10, page: 50, type: ['foo'], defaultSearchOperator: 'OR' });
  });

  it('accepts the optional query parameter has_reference', async () => {
    await supertest(httpSetup.server.listener).get('/api/saved_objects/_find?type=foo').expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options.hasReference).toBe(undefined);
  });

  it('accepts the query parameter has_reference', async () => {
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

  it('accepts the query parameter search_fields', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&search_fields=title')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      searchFields: ['title'],
      type: ['foo'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter fields as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&fields=title')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      fields: ['title'],
      type: ['foo'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter fields as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=foo&fields=title&fields=description')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      fields: ['title', 'description'],
      type: ['foo'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter type as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['index-pattern'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter type as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&type=visualization')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['index-pattern', 'visualization'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter namespaces as a string', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&namespaces=foo')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['index-pattern'],
      namespaces: ['foo'],
      defaultSearchOperator: 'OR',
    });
  });

  it('accepts the query parameter namespaces as an array', async () => {
    await supertest(httpSetup.server.listener)
      .get('/api/saved_objects/_find?type=index-pattern&namespaces=default&namespaces=foo')
      .expect(200);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['index-pattern'],
      namespaces: ['default', 'foo'],
      defaultSearchOperator: 'OR',
    });
  });
});
