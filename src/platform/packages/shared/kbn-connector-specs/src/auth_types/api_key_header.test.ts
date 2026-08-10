/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AuthContext } from '../connector_spec';
import { ApiKeyHeaderAuth } from './api_key_header';

const mockAuthContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  logger: loggerMock.create(),
  sslSettings: {},
};

describe('ApiKeyHeaderAuth', () => {
  describe('getAuthHeaders', () => {
    // At runtime the secret is normalized to `{ [headerName]: value }` (see normalizeSchema);
    // getAuthHeaders returns every secret entry except `authType`, mirroring `configure`.
    it('returns the secret entries as headers, excluding authType', async () => {
      const { getAuthHeaders } = ApiKeyHeaderAuth;
      if (!getAuthHeaders) throw new Error('ApiKeyHeaderAuth.getAuthHeaders is not defined');

      // Runtime secrets are normalized to `{ [headerName]: value }` and may still include `authType`.
      // Cast past the pre-normalize schema type that AuthTypeSpec exposes on getAuthHeaders.
      await expect(
        getAuthHeaders(mockAuthContext, {
          authType: 'api_key_header',
          'X-API-Key': 'abc123',
        } as never)
      ).resolves.toEqual({ 'X-API-Key': 'abc123' });
    });
  });
});
