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
    it('returns Authorization header with base64-encoded username:password', async () => {
      const { getAuthHeaders } = BasicAuth;
      if (!getAuthHeaders) throw new Error('BasicAuth.getAuthHeaders is not defined');
      await expect(
        getAuthHeaders(mockAuthContext, { username: 'alice', password: 'secret' })
      ).resolves.toEqual({
        Authorization: `Basic ${Buffer.from('alice:secret').toString('base64')}`,
      });
    });

    it('correctly encodes credentials containing colons in the password', async () => {
      const { getAuthHeaders } = BasicAuth;
      if (!getAuthHeaders) throw new Error('BasicAuth.getAuthHeaders is not defined');
      await expect(
        getAuthHeaders(mockAuthContext, { username: 'user', password: 'p:a:s:s' })
      ).resolves.toEqual({
        Authorization: `Basic ${Buffer.from('user:p:a:s:s').toString('base64')}`,
      });
    });
  });
});
