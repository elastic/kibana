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
import { registerScrollForExportRoute } from './scroll';

const createMockServer = () => {
  const mockServer = new Hapi.Server({
    debug: false,
    port: 8080,
    routes: {
      validate: {
        failAction: (r, h, err) => {
          throw err;
        },
      },
    },
  });
  return mockServer;
};

describe(`POST /api/kibana/management/saved_objects/scroll/export`, () => {
  test('requires "typesToInclude"', async () => {
    const mockServer = createMockServer();
    registerScrollForExportRoute(mockServer);

    const headers = {};
    const payload = {};

    const request = {
      method: 'POST',
      url: `/api/kibana/management/saved_objects/scroll/export`,
      headers,
      payload,
    };

    const { result, statusCode } = await mockServer.inject(request);
    expect(statusCode).toEqual(400);
    expect(result).toMatchObject({
      message: `child "typesToInclude" fails because ["typesToInclude" is required]`,
    });
  });

  test(`uses "typesToInclude" when searching for objects to export`, async () => {
    const mockServer = createMockServer();
    const mockClient = {
      find: jest.fn(() => {
        return {
          saved_objects: [],
        };
      }),
    };

    mockServer.decorate('request', 'getSavedObjectsClient', () => mockClient);

    registerScrollForExportRoute(mockServer);

    const headers = {};
    const payload = {
      typesToInclude: ['foo', 'bar'],
    };

    const request = {
      method: 'POST',
      url: `/api/kibana/management/saved_objects/scroll/export`,
      headers,
      payload,
    };

    const { result, statusCode } = await mockServer.inject(request);
    expect(statusCode).toEqual(200);
    expect(result).toEqual([]);

    expect(mockClient.find).toHaveBeenCalledWith({
      page: 1,
      perPage: 1000,
      type: ['foo', 'bar'],
    });
  });
});
