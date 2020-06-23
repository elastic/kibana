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

import { httpServiceMock } from '../../../../core/public/mocks';
import { getRelationships } from './get_relationships';

describe('getRelationships', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
  });

  it('should make an http request', async () => {
    await getRelationships(httpMock, 'dashboard', '1', ['search', 'index-pattern']);
    expect(httpMock.get).toHaveBeenCalledTimes(1);
  });

  it('should handle successful responses', async () => {
    httpMock.get.mockResolvedValue([1, 2]);

    const response = await getRelationships(httpMock, 'dashboard', '1', [
      'search',
      'index-pattern',
    ]);
    expect(response).toEqual([1, 2]);
  });

  it('should handle errors', async () => {
    httpMock.get.mockImplementation(() => {
      const err = new Error();
      (err as any).data = {
        error: 'Test error',
        statusCode: 500,
      };
      throw err;
    });

    await expect(
      getRelationships(httpMock, 'dashboard', '1', ['search', 'index-pattern'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Test error"`);
  });
});
