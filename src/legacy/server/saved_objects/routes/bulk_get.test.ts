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
import { createBulkGetRoute } from './bulk_get';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('POST /api/saved_objects/_bulk_get', () => {
  let server: Hapi.Server;
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    savedObjectsClient.bulkGet.mockImplementation(() =>
      Promise.resolve({
        saved_objects: [],
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

    server.route(createBulkGetRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.bulkGet.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_get',
      payload: [
        {
          id: 'abc123',
          type: 'index-pattern',
        },
      ],
    };

    const clientResponse = {
      saved_objects: [
        {
          id: 'abc123',
          type: 'index-pattern',
          title: 'logstash-*',
          version: 'foo',
          references: [],
          attributes: {},
        },
      ],
    };

    savedObjectsClient.bulkGet.mockImplementation(() => Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('calls upon savedObjectClient.bulkGet', async () => {
    const docs = [
      {
        id: 'abc123',
        type: 'index-pattern',
      },
    ];

    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_get',
      payload: docs,
    };

    await server.inject(request);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(docs);
  });
});
