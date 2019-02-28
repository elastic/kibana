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

import { getRelationships } from '../get_relationships';

describe('getRelationships', () => {
  it('should make an http request', async () => {
    const $http = jest.fn();
    const basePath = 'test';

    await getRelationships('dashboard', 1, ['search', 'index-pattern'], $http, basePath);
    expect($http.mock.calls.length).toBe(1);
  });

  it('should handle successful responses', async () => {
    const $http = jest.fn().mockImplementation(() => ({ data: [1, 2] }));
    const basePath = 'test';

    const response = await getRelationships('dashboard', 1, ['search', 'index-pattern'], $http, basePath);
    expect(response).toEqual([1, 2]);
  });

  it('should handle errors', async () => {
    const $http = jest.fn().mockImplementation(() => {
      throw {
        data: {
          error: 'Test error',
          statusCode: 500,
        },
      };
    });
    const basePath = 'test';

    try {
      await getRelationships('dashboard', 1, ['search', 'index-pattern'], $http, basePath);
    } catch (e) {
      // There isn't a great way to handle throwing exceptions
      // with async/await but this seems to work :shrug:
      expect(() => {
        throw e;
      }).toThrow();
    }
  });
});
