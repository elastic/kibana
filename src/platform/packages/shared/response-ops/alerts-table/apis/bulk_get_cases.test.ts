/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bulkGetCases } from './bulk_get_cases';
import { coreMock } from '@kbn/core/public/mocks';

describe('bulkGetCases', () => {
  const abortCtrl = new AbortController();
  const mockCoreSetup = coreMock.createSetup();
  const http = mockCoreSetup.http;

  beforeEach(() => {
    jest.clearAllMocks();
    http.post.mockResolvedValue({ cases: [], errors: [] });
  });

  it('fetch cases correctly', async () => {
    const res = await bulkGetCases(http, { ids: ['test-id'] }, abortCtrl.signal);
    expect(res).toEqual({ cases: [], errors: [] });
  });

  it('should call http with correct arguments', async () => {
    await bulkGetCases(http, { ids: ['test-id'] }, abortCtrl.signal);

    expect(http.post).toHaveBeenCalledWith('/internal/cases/_bulk_get', {
      body: '{"ids":["test-id"]}',
      signal: abortCtrl.signal,
    });
  });
});
