/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
