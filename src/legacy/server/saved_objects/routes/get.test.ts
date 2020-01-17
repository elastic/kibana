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
import { createGetRoute } from './get';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('GET /api/saved_objects/{type}/{id}', () => {
  let server: Hapi.Server;
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    savedObjectsClient.get.mockImplementation(() =>
      Promise.resolve({
        id: 'logstash-*',
        title: 'logstash-*',
        type: 'logstash-type',
        attributes: {},
        timeFieldName: '@timestamp',
        notExpandable: true,
        references: [],
      })
    );
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createGetRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.get.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/index-pattern/logstash-*',
    };
    const clientResponse = {
      id: 'logstash-*',
      title: 'logstash-*',
      type: 'logstash-type',
      attributes: {},
      timeFieldName: '@timestamp',
      notExpandable: true,
      references: [],
    };

    savedObjectsClient.get.mockImplementation(() => Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.get', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/index-pattern/logstash-*',
    };

    await server.inject(request);
    expect(savedObjectsClient.get).toHaveBeenCalled();

    const args = savedObjectsClient.get.mock.calls[0];
    expect(args).toEqual(['index-pattern', 'logstash-*']);
  });
});
