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

import { createExportRoute } from './export';
import { MockServer } from './_mock_server';

describe('GET /api/saved_objects/_export', () => {
  let server;
  const savedObjectsClient = {
    find: jest.fn(),
    bulkGet: jest.fn(),
  };

  beforeEach(() => {
    server = new MockServer();

    const prereqs = {
      getSavedObjectsClient: {
        assign: 'savedObjectsClient',
        method() {
          return savedObjectsClient;
        },
      },
    };

    server.route(createExportRoute(prereqs));
  });

  afterEach(() => {
    savedObjectsClient.find.mockClear();
    savedObjectsClient.bulkGet.mockClear();
  });

  test('formats successful response', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_export',
    };

    const { payload, statusCode } = await server.inject(request);
    expect(statusCode).toBe(200);
    expect(payload).toEqual('');
  });

  test('exports by single type', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_export?type=search',
    };
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [
        {
          id: '1',
          type: 'search',
          references: [],
        },
        {
          id: '2',
          type: 'search',
          references: [],
        },
      ],
    });

    const { payload, statusCode } = await server.inject(request);

    expect(statusCode).toBe(200);
    expect(payload).toMatchInlineSnapshot(`
"{\\"id\\":\\"1\\",\\"type\\":\\"search\\",\\"references\\":[]}
{\\"id\\":\\"2\\",\\"type\\":\\"search\\",\\"references\\":[]}"
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
    expect(savedObjectsClient.find.mock.calls[0]).toEqual([
      {
        type: ['search'],
        perPage: 10000,
      },
    ]);
  });

  test('exports by multiple types in order', async () => {
    const request = {
      method: 'GET',
      url: '/api/saved_objects/_export?type=["search","index-pattern"]',
    };
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      saved_objects: [
        {
          id: '2',
          type: 'search',
          references: [
            {
              type: 'index-pattern',
              id: '1',
            },
          ],
        },
        {
          id: '1',
          type: 'index-pattern',
          references: [],
        },
      ],
    });

    const { payload, statusCode } = await server.inject(request);

    expect(statusCode).toBe(200);
    expect(payload).toMatchInlineSnapshot(`
"{\\"id\\":\\"1\\",\\"type\\":\\"index-pattern\\",\\"references\\":[]}
{\\"id\\":\\"2\\",\\"type\\":\\"search\\",\\"references\\":[{\\"type\\":\\"index-pattern\\",\\"id\\":\\"1\\"}]}"
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
    expect(savedObjectsClient.find.mock.calls[0]).toEqual([
      {
        type: ['search', 'index-pattern'],
        perPage: 10000,
      },
    ]);
  });

  test('exports by objects in order', async () => {
    const request = {
      method: 'GET',
      url:
        '/api/saved_objects/_export?objects=[{"type":"search","id":"2"},{"type":"index-pattern","id":"1"}]',
    };
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '2',
          type: 'search',
          references: [
            {
              type: 'index-pattern',
              id: '1',
            },
          ],
        },
        {
          id: '1',
          type: 'index-pattern',
          references: [],
        },
      ],
    });

    const { payload, statusCode } = await server.inject(request);

    expect(statusCode).toBe(200);
    expect(payload).toMatchInlineSnapshot(`
"{\\"id\\":\\"1\\",\\"type\\":\\"index-pattern\\",\\"references\\":[]}
{\\"id\\":\\"2\\",\\"type\\":\\"search\\",\\"references\\":[{\\"type\\":\\"index-pattern\\",\\"id\\":\\"1\\"}]}"
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(0);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet.mock.calls[0]).toEqual([
      [
        {
          type: 'search',
          id: '2',
        },
        {
          type: 'index-pattern',
          id: '1',
        },
      ],
    ]);
  });
});
