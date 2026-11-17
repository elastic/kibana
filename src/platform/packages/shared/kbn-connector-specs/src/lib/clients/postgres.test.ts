/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { PROXY_NOT_SUPPORTED_MESSAGE, postgresClientType } from './postgres';

interface MockPool {
  end: jest.Mock;
  on: jest.Mock;
}

const mockPoolConstructor = jest.fn<MockPool, [Record<string, unknown>]>(() => ({
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
}));

jest.mock('pg', () => ({
  Pool: function Pool(opts: Record<string, unknown>) {
    return mockPoolConstructor(opts);
  },
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
  config: { host: 'db.example.com', port: 5432, database: 'testdb' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: true }),
  },
  ...overrides,
});

const lastPoolOptions = (): Record<string, unknown> =>
  mockPoolConstructor.mock.calls[mockPoolConstructor.mock.calls.length - 1][0];

describe('postgresClientType', () => {
  beforeEach(() => {
    mockPoolConstructor.mockClear();
  });

  it('has id "postgres"', () => {
    expect(postgresClientType.id).toBe('postgres');
  });

  describe('build', () => {
    it('calls ensureHostnameAllowed before creating the pool', async () => {
      const networkSettings = makeNetworkSettings();

      await postgresClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('db.example.com');
      expect(mockPoolConstructor).toHaveBeenCalledTimes(1);
    });

    it('does not create the pool when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });

      await expect(postgresClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        'Host not allowed'
      );
      expect(mockPoolConstructor).not.toHaveBeenCalled();
    });

    it('fails with a clear message when the host would be proxied', async () => {
      const networkSettings = makeNetworkSettings({
        getProxySettings: jest.fn().mockReturnValue({ proxyUrl: 'http://proxy:3128' }),
      });

      await expect(postgresClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        PROXY_NOT_SUPPORTED_MESSAGE
      );
      expect(mockPoolConstructor).not.toHaveBeenCalled();
    });

    it('connects directly when the host is in proxyBypassHosts', async () => {
      const networkSettings = makeNetworkSettings({
        getProxySettings: jest.fn().mockReturnValue({
          proxyUrl: 'http://proxy:3128',
          proxyBypassHosts: new Set(['db.example.com']),
        }),
      });

      await postgresClientType.build(makeCtx({ networkSettings }));

      expect(mockPoolConstructor).toHaveBeenCalledTimes(1);
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      await postgresClientType.build(makeCtx({ credential: makeCredential('alice', 'p@ss:word') }));

      expect(lastPoolOptions()).toEqual(
        expect.objectContaining({ user: 'alice', password: 'p@ss:word' })
      );
    });

    it('passes host, port, and database from config to the pool', async () => {
      await postgresClientType.build(
        makeCtx({ config: { host: 'pg.prod', port: 6543, database: 'prod_db' } })
      );

      expect(lastPoolOptions()).toEqual(
        expect.objectContaining({ host: 'pg.prod', port: 6543, database: 'prod_db' })
      );
    });

    it('applies the response timeout to the connection and to statements', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 15000, maxContentLength: 1 }),
      });

      await postgresClientType.build(makeCtx({ networkSettings }));

      expect(lastPoolOptions()).toEqual(
        expect.objectContaining({ connectionTimeoutMillis: 15000, statement_timeout: 15000 })
      );
    });

    it('applies Kibana TLS settings by default', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({
        rejectUnauthorized: true,
        ca: ['ca-pem'],
        cert: 'cert-pem',
        key: 'key-pem',
        passphrase: 'pw',
      });

      await postgresClientType.build(
        makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(buildTlsOptions).toHaveBeenCalledWith(
        [{ hostname: 'db.example.com', port: 5432 }],
        expect.anything()
      );
      expect(lastPoolOptions().ssl).toEqual({
        rejectUnauthorized: true,
        ca: ['ca-pem'],
        cert: 'cert-pem',
        key: 'key-pem',
        passphrase: 'pw',
      });
    });

    it('skips hostname verification only in "certificate" mode', async () => {
      const checkServerIdentity = jest.fn();
      const buildTlsOptions = jest
        .fn()
        .mockReturnValue({ rejectUnauthorized: true, checkServerIdentity });

      await postgresClientType.build(
        makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(lastPoolOptions().ssl).toEqual({ rejectUnauthorized: true, checkServerIdentity });
    });

    it('disables certificate verification in "none" mode', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: false });

      await postgresClientType.build(
        makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(lastPoolOptions().ssl).toEqual({ rejectUnauthorized: false });
    });

    it('turns TLS off when config.ssl is disabled', async () => {
      await postgresClientType.build(
        makeCtx({
          config: { host: 'db.example.com', port: 5432, database: 'testdb', ssl: 'disabled' },
        })
      );

      expect(lastPoolOptions().ssl).toBe(false);
    });

    it('registers a pool error listener so idle connection drops do not crash the process', async () => {
      const ctx = makeCtx();
      const pool = (await postgresClientType.build(ctx)) as unknown as MockPool;

      expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
      const [, listener] = pool.on.mock.calls[0];
      expect(() => listener(new Error('terminating connection'))).not.toThrow();
      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('terminating connection')
      );
    });
  });

  describe('terminate', () => {
    it('calls pool.end()', async () => {
      const pool = await postgresClientType.build(makeCtx());
      await postgresClientType.terminate(pool);
      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    const isUserError = (err: unknown): boolean => {
      const fn = postgresClientType.isUserError;
      if (!fn) {
        throw new Error('expected postgresClientType.isUserError');
      }
      return fn(err);
    };

    it.each(['28000', '28P01', '3D000', '42501', 'ECONNREFUSED', 'ENOTFOUND'])(
      'returns true for %s',
      (code) => {
        expect(isUserError(Object.assign(new Error('db error'), { code }))).toBe(true);
      }
    );

    it('returns true for the proxy-not-supported error', () => {
      expect(isUserError(new Error(PROXY_NOT_SUPPORTED_MESSAGE))).toBe(true);
    });

    it('returns true when TLS is required but the server does not support it', () => {
      expect(isUserError(new Error('The server does not support SSL connections'))).toBe(true);
    });

    it('returns false for transient / unknown error codes', () => {
      expect(isUserError(Object.assign(new Error('deadlock'), { code: '40P01' }))).toBe(false);
      expect(isUserError(Object.assign(new Error('shutdown'), { code: '57P01' }))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError('string error')).toBe(false);
      expect(isUserError(null)).toBe(false);
    });
  });
});
