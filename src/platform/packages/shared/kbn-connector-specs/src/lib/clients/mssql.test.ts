/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { mssqlClientType } from './mssql';
import { getResponseLimit } from './mssql_response_limit';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();
const mockConstructor = jest.fn();

jest.mock('mssql', () => ({
  ConnectionPool: class {
    public connect = mockConnect;
    public close = mockClose;
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
  config: { host: 'myserver.database.windows.net', port: 1433, database: 'testdb' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: true }),
  },
  ...overrides,
});

const lastPoolOptions = (): Record<string, unknown> => mockConstructor.mock.calls[0][0];

describe('mssqlClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has id "mssql"', () => {
    expect(mssqlClientType.id).toBe('mssql');
  });

  describe('build', () => {
    it('checks the allowed-hosts list before opening a pool', async () => {
      const networkSettings = makeNetworkSettings();

      await mssqlClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith(
        'myserver.database.windows.net'
      );
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('does not create the pool when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });

      await expect(mssqlClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        'Host not allowed'
      );
      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      await mssqlClientType.build(makeCtx({ credential: makeCredential('alice', 'p@ss:word') }));

      expect(lastPoolOptions()).toMatchObject({ user: 'alice', password: 'p@ss:word' });
    });

    it('passes server, port and database from config', async () => {
      await mssqlClientType.build(
        makeCtx({ config: { host: 'other.database.windows.net', port: 14330, database: 'prod' } })
      );

      expect(lastPoolOptions()).toMatchObject({
        server: 'other.database.windows.net',
        port: 14330,
        database: 'prod',
      });
    });

    it('always encrypts and verifies the certificate by default', async () => {
      await mssqlClientType.build(makeCtx());

      expect(lastPoolOptions().options).toMatchObject({
        encrypt: true,
        trustServerCertificate: false,
      });
    });

    it('resolves TLS per host and port so customHostSettings overrides apply', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true });
      const ctx = makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } });

      await mssqlClientType.build(ctx);

      expect(buildTlsOptions).toHaveBeenCalledWith(
        [{ hostname: 'myserver.database.windows.net', port: 1433 }],
        ctx.logger
      );
    });

    it('uses the merged per-host policy, not the global one, to decide certificate trust', async () => {
      // Global settings say "none" but the host-specific override resolved to full verification.
      const networkSettings = makeNetworkSettings({
        getSslSettings: jest.fn().mockReturnValue({ verificationMode: 'none' }),
      });
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true });

      await mssqlClientType.build(
        makeCtx({ networkSettings, platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(lastPoolOptions().options).toMatchObject({ trustServerCertificate: false });
    });

    it('trusts the server certificate only when the resolved policy disables verification', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: false });

      await mssqlClientType.build(
        makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(lastPoolOptions().options).toMatchObject({
        encrypt: true,
        trustServerCertificate: true,
      });
    });

    it('passes host-specific CA, client certificate, key and passphrase to the driver', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({
        rejectUnauthorized: true,
        ca: 'CA_PEM',
        cert: 'CERT_PEM',
        key: 'KEY_PEM',
        passphrase: 'secret',
      });

      await mssqlClientType.build(
        makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } })
      );

      expect(lastPoolOptions().options).toMatchObject({
        cryptoCredentialsDetails: {
          ca: 'CA_PEM',
          cert: 'CERT_PEM',
          key: 'KEY_PEM',
          passphrase: 'secret',
        },
      });
    });

    it('warns and keeps verifying the hostname when "certificate" mode is configured', async () => {
      // "certificate" mode is signalled by a no-op checkServerIdentity, which tedious cannot honor.
      const buildTlsOptions = jest
        .fn()
        .mockReturnValue({ rejectUnauthorized: true, checkServerIdentity: () => undefined });
      const ctx = makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } });

      await mssqlClientType.build(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('"certificate"'));
      expect(lastPoolOptions().options).toMatchObject({ trustServerCertificate: false });
    });

    it('does not warn for the default "full" policy', async () => {
      const ctx = makeCtx();

      await mssqlClientType.build(ctx);

      expect(ctx.logger.warn).not.toHaveBeenCalled();
    });

    it('applies the response timeout and a bounded pool', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 15000, maxContentLength: 1 }),
      });

      await mssqlClientType.build(makeCtx({ networkSettings }));

      expect(lastPoolOptions()).toMatchObject({
        connectionTimeout: 15000,
        requestTimeout: 15000,
        pool: expect.objectContaining({ max: 5, min: 0 }),
      });
    });

    it('records the Actions maximum response size on the pool for the spec to enforce', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 60000, maxContentLength: 2048 }),
      });

      const pool = await mssqlClientType.build(makeCtx({ networkSettings }));

      expect(getResponseLimit(pool)).toBe(2048);
    });

    it('registers an error listener so an idle-connection drop is not unhandled', async () => {
      await mssqlClientType.build(makeCtx());

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('propagates a connect failure', async () => {
      mockConnect.mockRejectedValueOnce(
        Object.assign(new Error('Login failed'), { code: 'ELOGIN' })
      );

      await expect(mssqlClientType.build(makeCtx())).rejects.toThrow('Login failed');
    });
  });

  describe('terminate', () => {
    it('closes the pool', async () => {
      const pool = await mssqlClientType.build(makeCtx());

      await mssqlClientType.terminate(pool);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    const isUserError = (err: unknown): boolean => {
      const fn = mssqlClientType.isUserError;
      if (!fn) {
        throw new Error('expected mssqlClientType.isUserError');
      }
      return fn(err);
    };

    it.each(['ELOGIN', 'ECONNREFUSED', 'ENOTFOUND'])('returns true for %s', (code) => {
      expect(isUserError(Object.assign(new Error('db error'), { code }))).toBe(true);
    });

    it('returns false for transient / unknown error codes', () => {
      expect(isUserError(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' }))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserError('string error')).toBe(false);
      expect(isUserError(null)).toBe(false);
    });
  });
});
