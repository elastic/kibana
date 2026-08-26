/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { mysqlClientType } from './mysql';

interface MockPool {
  end: jest.Mock;
}

const mockCreatePool = jest.fn<MockPool, [unknown?]>(() => ({
  end: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('mysql2/promise', () => ({
  createPool: (opts: unknown) => mockCreatePool(opts),
}));

const makeCredential = (username: string, password: string): BuildContext['credential'] => ({
  getAuthHeaders: jest.fn().mockResolvedValue({
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }),
});

const makeNetworkSettings = (
  overrides: Partial<BuildContext['networkSettings']> = {}
): BuildContext['networkSettings'] => ({
  ensureHostnameAllowed: jest.fn(),
  ensureUriAllowed: jest.fn(),
  getSslSettings: jest.fn().mockReturnValue({}),
  getProxySettings: jest.fn().mockReturnValue(undefined),
  getCustomHostSettings: jest.fn().mockReturnValue(undefined),
  getResponseSettings: jest.fn().mockReturnValue({ timeout: 60000, maxContentLength: 10485760 }),
  ...overrides,
});

const makeCtx = (overrides: Partial<BuildContext> = {}): BuildContext => ({
  logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as never,
  config: { host: 'db.example.com', port: 3306, database: 'testdb' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
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
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
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
        getSslSettings: jest.fn().mockReturnValue({ verificationMode: 'full' }),
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 15000, maxContentLength: 1 }),
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
