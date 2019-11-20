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
import { createDeleteRoute } from './delete';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('DELETE /api/saved_objects/{type}/{id}', () => {
  let server: Hapi.Server;
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    savedObjectsClient.delete.mockImplementation(() => Promise.resolve('{}'));
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createDeleteRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.delete.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'DELETE',
      url: '/api/saved_objects/index-pattern/logstash-*',
    };

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual({});
  });

  it('calls upon savedObjectClient.delete', async () => {
    const request = {
      method: 'DELETE',
      url: '/api/saved_objects/index-pattern/logstash-*',
    };

    await server.inject(request);
    expect(savedObjectsClient.delete).toHaveBeenCalledWith('index-pattern', 'logstash-*');
  });
});
