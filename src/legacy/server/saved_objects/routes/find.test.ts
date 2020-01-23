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

import Hapi from 'hapi';
import { createMockServer } from './_mock_server';
import { createFindRoute } from './find';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('GET /api/saved_objects/_find', () => {
  let server: Hapi.Server;
  const savedObjectsClient = savedObjectsClientMock.create();

  const clientResponse = {
    total: 0,
    saved_objects: [],
    per_page: 0,
    page: 0,
  };
  beforeEach(() => {
    savedObjectsClient.find.mockImplementation(() => Promise.resolve(clientResponse));
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createFindRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.find.mockReset();
  });

  it('returns with status 400 when type is missing', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find',
    };

    const { payload, statusCode } = await server.inject(request);

    expect(statusCode).toEqual(400);
    expect(JSON.parse(payload)).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'child "type" fails because ["type" is required]',
    });
  });

  it('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=index-pattern',
    };

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
          references: [],
        },
        {
          type: 'index-pattern',
          id: 'stocks-*',
          title: 'stocks-*',
          timeFieldName: '@timestamp',
          notExpandable: true,
          attributes: {},
          references: [],
        },
      ],
    };

    savedObjectsClient.find.mockImplementation(() => Promise.resolve(findResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(findResponse);
  });

  it('calls upon savedObjectClient.find with defaults', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=foo&type=bar',
    };

    await server.inject(request);

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
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=foo&per_page=10&page=50',
    };

    await server.inject(request);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({ perPage: 10, page: 50, type: ['foo'], defaultSearchOperator: 'OR' });
  });

  it('accepts the query parameter search_fields', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=foo&search_fields=title',
    };

    await server.inject(request);

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
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=foo&fields=title',
    };

    await server.inject(request);

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
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=foo&fields=title&fields=description',
    };

    await server.inject(request);

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
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=index-pattern',
    };

    await server.inject(request);

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
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_find?type=index-pattern&type=visualization',
    };

    await server.inject(request);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);

    const options = savedObjectsClient.find.mock.calls[0][0];
    expect(options).toEqual({
      perPage: 20,
      page: 1,
      type: ['index-pattern', 'visualization'],
      defaultSearchOperator: 'OR',
    });
  });
});
