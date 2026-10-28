/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { AuthContext } from '../connector_spec';
import { RELAY_AUTH_ID, RelayAuth } from './relay';

const mockAuthContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  logger: loggerMock.create(),
  sslSettings: {},
};

describe('RelayAuth', () => {
  it('is registered under the relay id', () => {
    expect(RelayAuth.id).toBe(RELAY_AUTH_ID);
    expect(RELAY_AUTH_ID).toBe('relay');
  });

  it('scopes credentials to the deployment rather than a user', () => {
    expect(RelayAuth.authMode).toBe('shared');
  });

  it('reaches the third party through the Relay', () => {
    expect(RelayAuth.usesRelayTransport).toBe(true);
  });

  it('is Kibana managed so a user can never configure it', () => {
    expect(RelayAuth.isKibanaManaged).toBe(true);
  });

  describe('schema', () => {
    it('accepts a tenant key', () => {
      expect(RelayAuth.schema.parse({ tenantKey: 'tenant-A' })).toEqual({ tenantKey: 'tenant-A' });
    });

    it('requires a non-empty tenant key', () => {
      expect(() => RelayAuth.schema.parse({})).toThrow();
      expect(() => RelayAuth.schema.parse({ tenantKey: '' })).toThrow();
    });

    it('hides the tenant key from generated forms', () => {
      expect(RelayAuth.schema.shape.tenantKey.meta()).toMatchObject({ hidden: true });
    });
  });

  describe('configure', () => {
    it('leaves the axios instance without credentials', async () => {
      const axiosInstance = axios.create();
      const headersBefore = { ...axiosInstance.defaults.headers.common };

      const configured = await RelayAuth.configure(mockAuthContext, axiosInstance, {
        tenantKey: 'tenant-A',
      });

      expect(configured).toBe(axiosInstance);
      expect(axiosInstance.defaults.headers.common).toEqual(headersBefore);
      expect(axiosInstance.defaults.headers.common.Authorization).toBeUndefined();
      expect(axiosInstance.defaults.auth).toBeUndefined();
    });
  });
});
