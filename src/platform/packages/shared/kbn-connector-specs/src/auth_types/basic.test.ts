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
import { BasicAuth } from './basic';

const mockAuthContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  logger: loggerMock.create(),
  sslSettings: {},
};

describe('BasicAuth', () => {
  describe('getAuthHeaders', () => {
    it('returns a base64-encoded Basic Authorization header', async () => {
      const { getAuthHeaders } = BasicAuth;
      if (!getAuthHeaders) throw new Error('BasicAuth.getAuthHeaders is not defined');

      const encoded = Buffer.from('user:pass').toString('base64');
      await expect(
        getAuthHeaders(mockAuthContext, { username: 'user', password: 'pass' })
      ).resolves.toEqual({ Authorization: `Basic ${encoded}` });
    });
  });
});
