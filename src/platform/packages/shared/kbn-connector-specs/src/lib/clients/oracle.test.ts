/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { oracleClientType, PROXY_NOT_SUPPORTED_MESSAGE } from './oracle';
import { getResponseLimit } from './mssql_response_limit';

const mockClose = jest.fn().mockResolvedValue(undefined);
const mockCreatePool = jest.fn();
const mockLib = {
  createPool: (attrs: unknown) => {
    mockCreatePool(attrs);
    return Promise.resolve({ close: mockClose });
  },
  OUT_FORMAT_OBJECT: 4002,
  CLOB: 'CLOB',
  NCLOB: 'NCLOB',
  outFormat: undefined as unknown,
  fetchAsString: undefined as unknown,
};

jest.mock('oracledb', () => ({ __esModule: true, default: mockLib }));

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
  config: { host: 'db.example.com', port: 1521, serviceName: 'ORCLPDB1', ssl: 'required' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: true }),
  },
  ...overrides,
});

const lastPoolAttrs = (): Record<string, unknown> => mockCreatePool.mock.calls[0][0];

describe('oracleClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has id "oracle"', () => {
    expect(oracleClientType.id).toBe('oracle');
  });

  describe('build', () => {
    it('checks the allowed-hosts list before creating a pool', async () => {
      const networkSettings = makeNetworkSettings();

      await oracleClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('db.example.com');
      expect(mockCreatePool).toHaveBeenCalledTimes(1);
    });

    it('does not create the pool when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });

      await expect(oracleClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        'Host not allowed'
      );
      expect(mockCreatePool).not.toHaveBeenCalled();
    });

    describe('proxy', () => {
      const proxied = (extra: Record<string, unknown> = {}) =>
        makeNetworkSettings({
          getProxySettings: jest.fn().mockReturnValue({ proxyUrl: 'http://proxy:8080', ...extra }),
        });

      it('refuses to connect when xpack.actions.proxyUrl applies, instead of silently bypassing it', async () => {
        const ctx = makeCtx({ networkSettings: proxied() });

        await expect(oracleClientType.build(ctx)).rejects.toThrow(PROXY_NOT_SUPPORTED_MESSAGE);
        expect(mockCreatePool).not.toHaveBeenCalled();
        expect(ctx.credential.getAuthHeaders).not.toHaveBeenCalled();
      });

      it('connects directly when the host is in proxyBypassHosts', async () => {
        const networkSettings = proxied({ proxyBypassHosts: new Set(['db.example.com']) });

        await oracleClientType.build(makeCtx({ networkSettings }));

        expect(mockCreatePool).toHaveBeenCalledTimes(1);
      });

      it('connects directly when the host is outside proxyOnlyHosts', async () => {
        const networkSettings = proxied({ proxyOnlyHosts: new Set(['other.example.com']) });

        await oracleClientType.build(makeCtx({ networkSettings }));

        expect(mockCreatePool).toHaveBeenCalledTimes(1);
      });
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      await oracleClientType.build(makeCtx({ credential: makeCredential('alice', 'p@ss:word') }));

      expect(lastPoolAttrs()).toMatchObject({ user: 'alice', password: 'p@ss:word' });
    });

    it('builds a tcps Easy Connect string from config when TLS is required', async () => {
      await oracleClientType.build(
        makeCtx({
          config: { host: 'oracle.corp', port: 2484, serviceName: 'PROD', ssl: 'required' },
        })
      );

      expect(lastPoolAttrs().connectString).toBe('tcps://oracle.corp:2484/PROD');
    });

    it('defaults to tcps when ssl is not configured', async () => {
      await oracleClientType.build(
        makeCtx({ config: { host: 'oracle.corp', port: 1521, serviceName: 'PROD' } })
      );

      expect(lastPoolAttrs().connectString).toBe('tcps://oracle.corp:1521/PROD');
    });

    it('uses plain tcp and skips TLS options when ssl is disabled', async () => {
      const buildTlsOptions = jest.fn();
      const ctx = makeCtx({
        config: { host: 'oracle.corp', port: 1521, serviceName: 'PROD', ssl: 'disabled' },
        platform: { resolveSrvHosts: jest.fn(), buildTlsOptions },
      });

      await oracleClientType.build(ctx);

      expect(lastPoolAttrs().connectString).toBe('tcp://oracle.corp:1521/PROD');
      expect(lastPoolAttrs()).not.toHaveProperty('sslServerDNMatch');
      expect(buildTlsOptions).not.toHaveBeenCalled();
    });

    it('resolves TLS per host and port so customHostSettings overrides apply', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true });
      const ctx = makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } });

      await oracleClientType.build(ctx);

      expect(buildTlsOptions).toHaveBeenCalledWith(
        [{ hostname: 'db.example.com', port: 1521 }],
        ctx.logger
      );
    });

    it('matches the server hostname in "full" mode and not in "certificate" mode', async () => {
      await oracleClientType.build(makeCtx());
      expect(lastPoolAttrs().sslServerDNMatch).toBe(true);

      mockCreatePool.mockClear();
      await oracleClientType.build(
        makeCtx({
          platform: {
            resolveSrvHosts: jest.fn(),
            buildTlsOptions: jest
              .fn()
              .mockReturnValue({ rejectUnauthorized: true, checkServerIdentity: () => undefined }),
          },
        })
      );
      expect(lastPoolAttrs().sslServerDNMatch).toBe(false);
    });

    it('passes custom CA, client certificate and key to the driver as a PEM wallet', async () => {
      const ctx = makeCtx({
        platform: {
          resolveSrvHosts: jest.fn(),
          buildTlsOptions: jest.fn().mockReturnValue({
            rejectUnauthorized: true,
            ca: '-----CA-----\n',
            cert: '-----CERT-----',
            key: '-----KEY-----',
            passphrase: 'wallet-pass',
          }),
        },
      });

      await oracleClientType.build(ctx);

      expect(lastPoolAttrs()).toMatchObject({
        walletContent: '-----CA-----\n-----CERT-----\n-----KEY-----',
        walletPassword: 'wallet-pass',
      });
    });

    it('sets no wallet when no custom TLS material is configured', async () => {
      await oracleClientType.build(makeCtx());

      expect(lastPoolAttrs()).not.toHaveProperty('walletContent');
    });

    it('warns that verification mode "none" cannot be honored', async () => {
      const ctx = makeCtx({
        platform: {
          resolveSrvHosts: jest.fn(),
          buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: false }),
        },
      });

      await oracleClientType.build(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('"none"'));
    });

    it('converts the Actions timeout to seconds for the connect options and queue', async () => {
      const networkSettings = makeNetworkSettings({
        getResponseSettings: jest.fn().mockReturnValue({ timeout: 30500, maxContentLength: 1 }),
      });

      await oracleClientType.build(makeCtx({ networkSettings }));

      expect(lastPoolAttrs()).toMatchObject({
        connectTimeout: 31,
        transportConnectTimeout: 31,
        queueTimeout: 30500,
      });
    });

    it('records the Actions maximum response size on the pool', async () => {
      const pool = await oracleClientType.build(makeCtx());

      expect(getResponseLimit(pool)).toBe(10485760);
    });

    it('returns rows as objects and CLOBs as strings', async () => {
      await oracleClientType.build(makeCtx());

      expect(mockLib.outFormat).toBe(4002);
      expect(mockLib.fetchAsString).toEqual(['CLOB', 'NCLOB']);
    });
  });

  describe('terminate', () => {
    it('closes the pool immediately', async () => {
      const pool = await oracleClientType.build(makeCtx());

      await oracleClientType.terminate(pool);

      expect(mockClose).toHaveBeenCalledWith(0);
    });
  });

  describe('isUserError', () => {
    it.each([
      'ORA-01017',
      'ORA-28000',
      'ORA-28001',
      'ORA-12514',
      'ORA-12541',
      'NJS-508',
      'NJS-511',
      'ECONNREFUSED',
      'ENOTFOUND',
    ])('classifies %s as a user error', (code) => {
      expect(oracleClientType.isUserError?.(Object.assign(new Error('boom'), { code }))).toBe(true);
    });

    it('classifies the proxy refusal as a user error', () => {
      expect(oracleClientType.isUserError?.(new Error(PROXY_NOT_SUPPORTED_MESSAGE))).toBe(true);
    });

    it('does not classify other failures as user errors', () => {
      expect(
        oracleClientType.isUserError?.(Object.assign(new Error('x'), { code: 'ORA-00600' }))
      ).toBe(false);
      expect(oracleClientType.isUserError?.('not an error')).toBe(false);
    });
  });
});
