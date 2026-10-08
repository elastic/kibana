/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AccessControlClient } from './access_control_client';

const createMockHttp = () => ({
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  fetch: jest.fn(),
  head: jest.fn(),
  options: jest.fn(),
  addLoadingCountSource: jest.fn(),
  getLoadingCount$: jest.fn(),
  anonymousPaths: {} as any,
  externalUrl: {} as any,
  staticAssets: {} as any,
  basePath: {} as any,
  intercept: jest.fn(),
});

describe('AccessControlClient', () => {
  describe('checkGlobalPrivilege', () => {
    it('returns isGloballyAuthorized from the response on success', async () => {
      const http = createMockHttp();
      http.get.mockResolvedValue({ isGloballyAuthorized: true });
      const client = new AccessControlClient({ http: http as any });

      const result = await client.checkGlobalPrivilege('dashboard');

      expect(http.get).toHaveBeenCalledWith('/internal/access_control/global_access/dashboard');
      expect(result).toEqual({ isGloballyAuthorized: true });
    });

    it('returns isGloballyAuthorized: false when the http call throws a 500 error', async () => {
      const http = createMockHttp();
      const error = Object.assign(new Error('Internal Server Error'), {
        response: { status: 500 },
      });
      http.get.mockRejectedValue(error);
      const client = new AccessControlClient({ http: http as any });

      const result = await client.checkGlobalPrivilege('dashboard');

      expect(result).toEqual({ isGloballyAuthorized: false });
    });
  });

  describe('isAccessControlEnabled', () => {
    it('returns true when the http call succeeds and isAccessControlEnabled is true', async () => {
      const http = createMockHttp();
      http.get.mockResolvedValue({ isAccessControlEnabled: true });
      const client = new AccessControlClient({ http: http as any });

      const result = await client.isAccessControlEnabled();

      expect(http.get).toHaveBeenCalledWith('/internal/access_control/is_enabled');
      expect(result).toBe(true);
    });

    it('returns false when the http call throws a 500 error', async () => {
      const http = createMockHttp();
      const error = Object.assign(new Error('Internal Server Error'), {
        response: { status: 500 },
      });
      http.get.mockRejectedValue(error);
      const client = new AccessControlClient({ http: http as any });

      const result = await client.isAccessControlEnabled();

      expect(result).toBe(false);
    });
  });
});
