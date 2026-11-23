/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { getResponseLimit } from './mssql_response_limit';
import { postgresqlClientType, PROXY_NOT_SUPPORTED_MESSAGE } from './postgresql';

const mockRelease = jest.fn();
const mockPoolConnect = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();
const mockConstructor = jest.fn();

jest.mock('pg', () => ({
  Pool: class {
    public connect = mockPoolConnect;
    public end = mockEnd;
    public on = mockOn;
    constructor(options: unknown) {
      mockConstructor(options);
    }
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
  config: { host: 'db.example.com', port: 5432, database: 'testdb', ssl: 'required' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: true }),
  },
  ...overrides,
});

const lastPoolOptions = (): Record<string, unknown> => mockConstructor.mock.calls[0][0];

describe('postgresqlClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolConnect.mockResolvedValue({ release: mockRelease });
  });

  it('has id "postgresql"', () => {
    expect(postgresqlClientType.id).toBe('postgresql');
  });

  describe('build', () => {
    it('checks the allowed-hosts list before opening a pool', async () => {
      const networkSettings = makeNetworkSettings();

      await postgresqlClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('db.example.com');
      expect(mockPoolConnect).toHaveBeenCalledTimes(1);
    });

    it('does not create the pool when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });

      await expect(postgresqlClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        'Host not allowed'
      );
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    describe('proxy', () => {
      const proxied = (extra: Record<string, unknown> = {}) =>
        makeNetworkSettings({
          getProxySettings: jest.fn().mockReturnValue({ proxyUrl: 'http://proxy:8080', ...extra }),
        });

      it('refuses to connect when xpack.actions.proxyUrl applies, instead of silently bypassing it', async () => {
        const ctx = makeCtx({ networkSettings: proxied() });

        await expect(postgresqlClientType.build(ctx)).rejects.toThrow(PROXY_NOT_SUPPORTED_MESSAGE);
        expect(mockConstructor).not.toHaveBeenCalled();
        expect(ctx.credential.getAuthHeaders).not.toHaveBeenCalled();
      });

      it('connects directly when the host is in proxyBypassHosts', async () => {
        const networkSettings = proxied({ proxyBypassHosts: new Set(['db.example.com']) });

        await postgresqlClientType.build(makeCtx({ networkSettings }));

        expect(mockConstructor).toHaveBeenCalledTimes(1);
      });

      it('connects directly when the host is outside proxyOnlyHosts', async () => {
        const networkSettings = proxied({ proxyOnlyHosts: new Set(['other.example.com']) });

        await postgresqlClientType.build(makeCtx({ networkSettings }));

        expect(mockConstructor).toHaveBeenCalledTimes(1);
      });
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      await postgresqlClientType.build(
        makeCtx({ credential: makeCredential('alice', 'p@ss:word') })
      );

      expect(lastPoolOptions()).toMatchObject({ user: 'alice', password: 'p@ss:word' });
    });

    it('passes host, port and database from config', async () => {
      await postgresqlClientType.build(
        makeCtx({ config: { host: 'other.example.com', port: 6543, database: 'prod' } })
      );

      expect(lastPoolOptions()).toMatchObject({
        host: 'other.example.com',
        port: 6543,
        database: 'prod',
      });
    });

    describe('TLS', () => {
      it('resolves TLS per host and port so customHostSettings overrides apply', async () => {
        const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true });
        const ctx = makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } });

        await postgresqlClientType.build(ctx);

        expect(buildTlsOptions).toHaveBeenCalledWith(
          [{ hostname: 'db.example.com', port: 5432 }],
          ctx.logger
        );
      });

      it('requires TLS by default when the config does not set ssl', async () => {
        await postgresqlClientType.build(
          makeCtx({ config: { host: 'db.example.com', port: 5432, database: 'testdb' } })
        );

        expect(lastPoolOptions().ssl).toEqual({ rejectUnauthorized: true });
      });

      it('passes the resolved CA, client certificate, key, passphrase and verification mode to the driver', async () => {
        const checkServerIdentity = () => undefined;
        const tls = {
          rejectUnauthorized: true,
          checkServerIdentity,
          ca: 'CA_PEM',
          cert: 'CERT_PEM',
          key: 'KEY_PEM',
          passphrase: 'secret',
        };
        const buildTlsOptions = jest.fn().mockReturnValue(tls);

        await postgresqlClientType.build(
          makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
        );

        expect(lastPoolOptions().ssl).toEqual(tls);
      });

      it('does not use TLS when ssl is disabled', async () => {
        const buildTlsOptions = jest.fn();
        const ctx = makeCtx({
          config: { host: 'db.example.com', port: 5432, database: 'testdb', ssl: 'disabled' },
          platform: { resolveSrvHosts: jest.fn(), buildTlsOptions },
        });

        await postgresqlClientType.build(ctx);

        expect(lastPoolOptions().ssl).toBe(false);
        expect(buildTlsOptions).not.toHaveBeenCalled();
      });
    });

    it('applies the response timeout and a bounded pool', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 15000, maxContentLength: 1 }),
      });

      await postgresqlClientType.build(makeCtx({ networkSettings }));

      expect(lastPoolOptions()).toMatchObject({
        max: 5,
        connectionTimeoutMillis: 15000,
        statement_timeout: 15000,
        query_timeout: 15000,
      });
    });

    it('records the Actions maximum response size on the pool for the spec to enforce', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 60000, maxContentLength: 2048 }),
      });

      const pool = await postgresqlClientType.build(makeCtx({ networkSettings }));

      expect(getResponseLimit(pool)).toBe(2048);
    });

    it('registers an error listener so an idle-connection drop is not unhandled', async () => {
      await postgresqlClientType.build(makeCtx());

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('connects eagerly and returns the probe connection to the pool', async () => {
      await postgresqlClientType.build(makeCtx());

      expect(mockPoolConnect).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('closes the pool and propagates the error when the first connection fails', async () => {
      mockPoolConnect.mockRejectedValueOnce(
        Object.assign(new Error('password authentication failed'), { code: '28P01' })
      );

      await expect(postgresqlClientType.build(makeCtx())).rejects.toThrow(
        'password authentication failed'
      );
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('terminate', () => {
    it('ends the pool', async () => {
      const pool = await postgresqlClientType.build(makeCtx());

      await postgresqlClientType.terminate(pool);

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    const isUserError = (err: unknown): boolean => {
      const fn = postgresqlClientType.isUserError;
      if (!fn) {
        throw new Error('expected postgresqlClientType.isUserError');
      }
      return fn(err);
    };

    it.each([
      '28P01',
      '28000',
      '3D000',
      '42501',
      'ECONNREFUSED',
      'ENOTFOUND',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'CERT_HAS_EXPIRED',
      'ERR_TLS_CERT_ALTNAME_INVALID',
    ])('returns true for %s', (code) => {
      expect(isUserError(Object.assign(new Error('db error'), { code }))).toBe(true);
    });

    it('returns true for the proxy-not-supported error, which is a configuration problem', () => {
      expect(isUserError(new Error(PROXY_NOT_SUPPORTED_MESSAGE))).toBe(true);
    });

    it('returns true when TLS is required but the server does not support it', () => {
      expect(isUserError(new Error('The server does not support SSL connections'))).toBe(true);
    });

    it('returns false for transient / unknown error codes', () => {
      expect(isUserError(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))).toBe(false);
      expect(isUserError(Object.assign(new Error('deadlock'), { code: '40P01' }))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError('string error')).toBe(false);
      expect(isUserError(null)).toBe(false);
    });
  });
});
