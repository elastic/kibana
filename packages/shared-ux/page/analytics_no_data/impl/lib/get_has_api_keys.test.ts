/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { HasApiKeysResponse, getHasApiKeys$ } from './get_has_api_keys';

describe('getHasApiKeys$', () => {
  let mockHttp: HttpSetup;
  beforeEach(() => {
    mockHttp = httpServiceMock.createSetupContract({ basePath: '/test' });
  });

  it('should return the correct sequence of states', (done) => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockResolvedValue({ hasApiKeys: true });
    const source$ = getHasApiKeys$(mockHttp);

    const emittedValues: HasApiKeysResponse[] = [];

    source$.subscribe({
      next: (value) => emittedValues.push(value),
      complete: () => {
        expect(emittedValues).toEqual([
          { error: null, hasApiKeys: null, isLoading: true },
          { error: null, hasApiKeys: true, isLoading: false },
        ]);
        done();
      },
    });
  });

  it('should forward the error', (done) => {
    const httpGetSpy = jest.spyOn(mockHttp, 'get');
    httpGetSpy.mockRejectedValue('something bad');
    const source$ = getHasApiKeys$(mockHttp);

    const emittedValues: HasApiKeysResponse[] = [];

    source$.subscribe({
      next: (value) => emittedValues.push(value),
      complete: () => {
        expect(emittedValues).toEqual([
          { error: null, hasApiKeys: null, isLoading: true },
          { error: 'something bad', hasApiKeys: null, isLoading: false },
        ]);
        done();
      },
    });
  });
});
