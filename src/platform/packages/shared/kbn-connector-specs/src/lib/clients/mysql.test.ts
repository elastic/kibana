/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { BuildContext } from './client_type_spec';
import { mysqlClientType } from './mysql';

interface MockPool {
  end: Mock;
}

const mockCreatePool = vi.fn<(...args: [unknown?]) => MockPool>(() => ({
  end: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('mysql2/promise', () => {
  const mocked = {
    createPool: (opts: unknown) => mockCreatePool(opts),
  };
  return { ...mocked, default: mocked };
});

const makeCredential = (username: string, password: string): BuildContext['credential'] => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }),
});

const makeNetworkSettings = (
  overrides: Partial<BuildContext['networkSettings']> = {}
): BuildContext['networkSettings'] => ({
  ensureHostnameAllowed: vi.fn(),
  ensureUriAllowed: vi.fn(),
  getSslSettings: vi.fn().mockReturnValue({}),
  getProxySettings: vi.fn().mockReturnValue(undefined),
  getCustomHostSettings: vi.fn().mockReturnValue(undefined),
  getResponseSettings: vi.fn().mockReturnValue({ timeout: 60000, maxContentLength: 10485760 }),
  ...overrides,
});

const makeCtx = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() } as never,
  config: { host: 'db.example.com', port: 3306, database: 'testdb' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: { resolveSrvHosts: vi.fn(), buildTlsOptions: vi.fn() },
  ...overrides,
});

describe('mysqlClientType', () => {
  beforeEach(() => {
    mockCreatePool.mockClear();
  });

  it('has id "mysql"', () => {
    expect(mysqlClientType.id).toBe('mysql');
  });

  describe('build', () => {
    it('calls ensureHostnameAllowed before creating the pool', async () => {
      const networkSettings = makeNetworkSettings();
      const ctx = makeCtx({ networkSettings });

      await mysqlClientType.build(ctx);

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('db.example.com');
      expect(mockCreatePool).toHaveBeenCalledTimes(1);
    });

    it('does not create the pool when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: vi.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });
      const ctx = makeCtx({ networkSettings });

      await expect(mysqlClientType.build(ctx)).rejects.toThrow('Host not allowed');
      expect(mockCreatePool).not.toHaveBeenCalled();
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      const ctx = makeCtx({ credential: makeCredential('alice', 'p@ss:word') });

      await mysqlClientType.build(ctx);

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.objectContaining({ user: 'alice', password: 'p@ss:word' })
      );
    });

    it('passes host, port, and database from config to createPool', async () => {
      const ctx = makeCtx({
        config: { host: 'mysql.prod', port: 3307, database: 'prod_db' },
      });

      await mysqlClientType.build(ctx);

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'mysql.prod', port: 3307, database: 'prod_db' })
      );
    });

    it('applies Kibana TLS settings and connect timeout by default', async () => {
      const networkSettings = makeNetworkSettings({
        getSslSettings: vi.fn().mockReturnValue({ verificationMode: 'full' }),
        getResponseSettings: vi.fn().mockReturnValue({ timeout: 15000, maxContentLength: 1 }),
      });
      const ctx = makeCtx({ networkSettings });

      await mysqlClientType.build(ctx);

      expect(mockCreatePool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectTimeout: 15000,
          queueLimit: 100,
          ssl: expect.objectContaining({ rejectUnauthorized: true, verifyIdentity: true }),
        })
      );
    });

    it('omits ssl when config.ssl is disabled', async () => {
      const ctx = makeCtx({
        config: { host: 'db.example.com', port: 3306, database: 'testdb', ssl: 'disabled' },
      });

      await mysqlClientType.build(ctx);

      const opts = mockCreatePool.mock.calls[0][0] as Record<string, unknown>;
      expect(opts.ssl).toBeUndefined();
    });
  });

  describe('terminate', () => {
    it('calls pool.end()', async () => {
      const pool = await mysqlClientType.build(makeCtx());
      await mysqlClientType.terminate(pool as never);
      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    const isUserError = (err: unknown): boolean => {
      const fn = mysqlClientType.isUserError;
      if (!fn) {
        throw new Error('expected mysqlClientType.isUserError');
      }
      return fn(err);
    };

    it.each([
      'ER_ACCESS_DENIED_ERROR',
      'ER_DBACCESS_DENIED_ERROR',
      'ER_BAD_DB_ERROR',
      'ECONNREFUSED',
      'ENOTFOUND',
    ])('returns true for %s', (code) => {
      const err = Object.assign(new Error('db error'), { code });
      expect(isUserError(err)).toBe(true);
    });

    it('returns false for transient / unknown error codes', () => {
      const err = Object.assign(new Error('unknown'), { code: 'ER_LOCK_DEADLOCK' });
      expect(isUserError(err)).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError('string error')).toBe(false);
      expect(isUserError(null)).toBe(false);
    });
  });
});
