/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext } from '../connector_spec';
import { RELAY_AUTH_ID, RelayAuth } from './relay';

describe('RelayAuth', () => {
  it('is registered under the relay id, shared across the deployment', () => {
    expect(RelayAuth.id).toBe(RELAY_AUTH_ID);
    expect(RelayAuth.authMode).toBe('shared');
  });

  describe('schema', () => {
    it('requires a non-empty tenant key', () => {
      expect(RelayAuth.schema.safeParse({ tenantKey: 'tenant-A' }).success).toBe(true);
      expect(RelayAuth.schema.safeParse({ tenantKey: '' }).success).toBe(false);
      expect(RelayAuth.schema.safeParse({}).success).toBe(false);
    });

    it('hides the tenant key, which is set programmatically rather than typed in', () => {
      expect(RelayAuth.schema.shape.tenantKey.meta()).toEqual(
        expect.objectContaining({ hidden: true })
      );
    });
  });

  describe('configure', () => {
    it('returns the axios instance untouched, setting no credentials on it', async () => {
      const axiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      const configured = await RelayAuth.configure({} as AuthContext, axiosInstance, {
        tenantKey: 'tenant-A',
      });

      expect(configured).toBe(axiosInstance);
      expect(axiosInstance.defaults.headers.common).toEqual({});
    });
  });
});
