/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { AuthContext } from '../connector_spec';
import { ApiKeyQueryAuth } from './api_key_query';

const mockCtx = {
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  proxySettings: undefined,
  sslSettings: { verificationMode: 'full' as const },
} as unknown as AuthContext;

describe('ApiKeyQueryAuth', () => {
  it('has id api_key_query, a paramNames config field, and a default single apiKey field', () => {
    expect(ApiKeyQueryAuth.id).toBe('api_key_query');
    expect(ApiKeyQueryAuth.schema.shape.paramNames).toBeDefined();
    expect(ApiKeyQueryAuth.schema.shape.apiKey).toBeDefined();
  });

  describe('normalizeSchema', () => {
    it('falls back to the single apiKey field when no paramNames are given', () => {
      const schema = ApiKeyQueryAuth.normalizeSchema?.(undefined);
      expect(schema?.shape.apiKey).toBeDefined();
    });

    it('produces one sensitive field per configured paramName', () => {
      const schema = ApiKeyQueryAuth.normalizeSchema?.({ paramNames: ['key', 'token'] });
      expect(schema?.shape.key).toBeDefined();
      expect(schema?.shape.token).toBeDefined();
      expect(schema?.shape.key.meta()).toMatchObject({ sensitive: true });
      expect(schema?.shape.token.meta()).toMatchObject({ sensitive: true });
    });

    it('applies the authentication section label to the paramNames schema', () => {
      const schema = ApiKeyQueryAuth.normalizeSchema?.({ paramNames: ['key', 'token'] });
      expect(schema?.meta()).toMatchObject({ label: expect.any(String) });
    });

    it('filters out empty-string entries from paramNames', () => {
      const schema = ApiKeyQueryAuth.normalizeSchema?.({ paramNames: ['key', '', 'token'] });
      expect(schema?.shape.key).toBeDefined();
      expect(schema?.shape.token).toBeDefined();
      expect(schema?.shape['']).toBeUndefined();
    });
  });

  describe('configure', () => {
    // configure()'s static type is fixed to the base single-`apiKey` schema, but at
    // runtime normalizeSchema() produces dynamically-named secrets (e.g. `key`/`token`
    // for Trello). Cast to match what the framework actually passes at runtime.
    type NormalizedSecret = Parameters<typeof ApiKeyQueryAuth.configure>[2];

    it('sets each secret key/value as a query param and filters out authType', async () => {
      const axiosInstance = axios.create();

      await ApiKeyQueryAuth.configure(mockCtx, axiosInstance, {
        key: 'my-key',
        token: 'my-token',
        authType: 'api_key_query',
      } as unknown as NormalizedSecret);

      expect(axiosInstance.defaults.params).toEqual({ key: 'my-key', token: 'my-token' });
    });

    it('merges with any pre-existing defaults.params rather than overwriting them', async () => {
      const axiosInstance = axios.create();
      axiosInstance.defaults.params = { existing: 'value' };

      await ApiKeyQueryAuth.configure(mockCtx, axiosInstance, {
        key: 'my-key',
      } as unknown as NormalizedSecret);

      expect(axiosInstance.defaults.params).toEqual({ existing: 'value', key: 'my-key' });
    });
  });
});
