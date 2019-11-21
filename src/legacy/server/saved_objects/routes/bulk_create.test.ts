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
import { createBulkCreateRoute } from './bulk_create';
// Disable lint errors for imports from src/core/* until SavedObjects migration is complete
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from '../../../../core/server/saved_objects/service/saved_objects_client.mock';

describe('POST /api/saved_objects/_bulk_create', () => {
  let server: Hapi.Server;
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    savedObjectsClient.bulkCreate.mockImplementation(() => Promise.resolve('' as any));
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createBulkCreateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.bulkCreate.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_create',
      payload: [
        {
          id: 'abc123',
          type: 'index-pattern',
          attributes: {
            title: 'my_title',
          },
        },
      ],
    };

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

    savedObjectsClient.bulkCreate.mockImplementation(() => Promise.resolve(clientResponse));

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
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

    const request = {
      method: 'POST',
      url: '/api/saved_objects/_bulk_create',
      payload: docs,
    };

    await server.inject(request);
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalled();

    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[0]).toEqual(docs);
  });

  it('passes along the overwrite option', async () => {
    await server.inject({
      method: 'POST',
      url: '/api/saved_objects/_bulk_create?overwrite=true',
      payload: [
        {
          id: 'abc1234',
          type: 'index-pattern',
          attributes: {
            title: 'foo',
          },
          references: [],
        },
      ],
    });

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalled();

    const args = savedObjectsClient.bulkCreate.mock.calls[0];
    expect(args[1]).toEqual({ overwrite: true });
  });
});
