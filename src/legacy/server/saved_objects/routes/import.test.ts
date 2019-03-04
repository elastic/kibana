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
import { SavedObjectsClient } from '../';
import { createMockServer } from './_mock_server';
import { createImportRoute } from './import';

describe('POST /api/saved_objects/_import', () => {
  let server: Hapi.Server;
  let savedObjectsClient: SavedObjectsClient;

  beforeEach(() => {
    server = createMockServer();
    savedObjectsClient = {
      errors: {} as any,
      bulkCreate: jest.fn(),
      bulkGet: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    };

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createImportRoute(prereqs));
  });

  test('formats successful response', async () => {
    const request = {
      method: 'POST',
      url: '/api/saved_objects/_import',
      payload: [
        '--BOUNDARY',
        'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
        'Content-Type: application/ndjson',
        '',
        '',
        '--BOUNDARY--',
      ].join('\r\n'),
      headers: {
        'content-Type': 'multipart/form-data; boundary=BOUNDARY',
      },
    };
    const { payload, statusCode } = await server.inject(request);
    const response = JSON.parse(payload);
    expect(statusCode).toBe(200);
    expect(response).toEqual({ success: true });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
  });
});
