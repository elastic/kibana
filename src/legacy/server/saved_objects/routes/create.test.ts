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
import { createCreateRoute } from './create';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('POST /api/saved_objects/{type}', () => {
  let server: Hapi.Server;
  const clientResponse = {
    id: 'logstash-*',
    type: 'index-pattern',
    title: 'logstash-*',
    version: 'foo',
    references: [],
    attributes: {},
  };
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    savedObjectsClient.create.mockImplementation(() => Promise.resolve(clientResponse));
    server = createMockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createCreateRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.create.mockReset();
  });

  it('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing',
        },
      },
    };

    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(statusCode).toBe(200);
    expect(response).toEqual(clientResponse);
  });

  it('requires attributes', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {},
    };

    const { statusCode, payload } = await server.inject(request);
    const response = JSON.parse(payload);

    expect(response.validation.keys).toContain('attributes');
    expect(response.message).toMatch(/is required/);
    expect(response.statusCode).toBe(400);
    expect(statusCode).toBe(400);
  });

  it('calls upon savedObjectClient.create', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern',
      payload: {
        attributes: {
          title: 'Testing',
        },
      },
    };

    await server.inject(request);
    expect(savedObjectsClient.create).toHaveBeenCalled();

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'index-pattern',
      { title: 'Testing' },
      { overwrite: false, id: undefined, migrationVersion: undefined, references: [] }
    );
  });

  it('can specify an id', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/index-pattern/logstash-*',
      payload: {
        attributes: {
          title: 'Testing',
        },
      },
    };

    await server.inject(request);
    expect(savedObjectsClient.create).toHaveBeenCalled();

    const args = savedObjectsClient.create.mock.calls[0];
    const options = { overwrite: false, id: 'logstash-*', references: [] };
    const attributes = { title: 'Testing' };

    expect(args).toEqual(['index-pattern', attributes, options]);
  });
});
