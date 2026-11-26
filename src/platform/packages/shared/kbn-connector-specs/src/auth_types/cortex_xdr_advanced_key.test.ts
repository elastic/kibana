/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash, webcrypto } from 'crypto';
import axios from 'axios';
import type { AuthContext } from '../connector_spec';
import {
  buildCortexXdrAuthHeaders,
  CortexXdrAdvancedKeyAuth,
  createCortexXdrNonce,
  CORTEX_XDR_NONCE_LENGTH,
} from './cortex_xdr_advanced_key';

const API_KEY = 'canary-cortex-xdr-key-0123456789';

const authContext = {
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  sslSettings: {},
} as unknown as AuthContext;

/** Configures the auth type and captures the headers of the next requests without sending them. */
const captureHeaders = async () => {
  const instance = axios.create();
  const captured: Array<Record<string, unknown>> = [];
  // Registered first, so it runs after the signing interceptor (request interceptors run LIFO).
  instance.interceptors.request.use((config) => {
    captured.push({ ...config.headers.toJSON() });
    return Promise.reject(Object.assign(new Error('captured'), { captured: true }));
  });
  await CortexXdrAdvancedKeyAuth.configure(authContext, instance, {
    apiKeyId: '42',
    apiKey: API_KEY,
  });
  const send = () =>
    instance.post('https://api-tenant.xdr.us.paloaltonetworks.com/x').catch(() => {});
  return { captured, send };
};

describe('Cortex XDR Advanced API key auth', () => {
  beforeAll(() => {
    if (!globalThis.crypto?.subtle) {
      Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    }
  });

  it('declares the key id and a sensitive key', () => {
    expect(CortexXdrAdvancedKeyAuth.id).toBe('cortex_xdr_advanced_key');
    expect(Object.keys(CortexXdrAdvancedKeyAuth.schema.shape)).toEqual(['apiKeyId', 'apiKey']);
    expect(CortexXdrAdvancedKeyAuth.schema.safeParse({ apiKeyId: '', apiKey: 'x' }).success).toBe(
      false
    );
    expect(CortexXdrAdvancedKeyAuth.schema.safeParse({ apiKeyId: '1', apiKey: '' }).success).toBe(
      false
    );
  });

  it('signs as documented: hex SHA-256 of key + nonce + timestamp', async () => {
    const nonce = 'a'.repeat(64);
    const headers = await buildCortexXdrAuthHeaders('42', API_KEY, nonce, '1700000000000');
    expect(headers).toEqual({
      'x-xdr-auth-id': '42',
      'x-xdr-nonce': nonce,
      'x-xdr-timestamp': '1700000000000',
      Authorization: createHash('sha256').update(`${API_KEY}${nonce}1700000000000`).digest('hex'),
    });
  });

  it('creates 64-character alphanumeric nonces that differ each time', () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createCortexXdrNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce).toMatch(new RegExp(`^[A-Za-z0-9]{${CORTEX_XDR_NONCE_LENGTH}}$`));
    }
  });

  it('signs every request with a fresh nonce and timestamp and never sends the key', async () => {
    const { captured, send } = await captureHeaders();
    await send();
    await send();
    expect(captured).toHaveLength(2);
    for (const headers of captured) {
      expect(headers['x-xdr-auth-id']).toBe('42');
      expect(headers['x-xdr-timestamp']).toMatch(/^\d{13}$/);
      expect(headers.Authorization).toBe(
        createHash('sha256')
          .update(`${API_KEY}${headers['x-xdr-nonce']}${headers['x-xdr-timestamp']}`)
          .digest('hex')
      );
      expect(JSON.stringify(headers)).not.toContain(API_KEY);
    }
    expect(captured[0]['x-xdr-nonce']).not.toBe(captured[1]['x-xdr-nonce']);
  });
});
