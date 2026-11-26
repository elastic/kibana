/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildContext } from './client_type_spec';
import { redisClientType, PROXY_NOT_SUPPORTED_MESSAGE } from './redis';
import { getResponseLimit } from './mssql_response_limit';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn();
const mockOn = jest.fn();
const mockConstructor = jest.fn();

jest.mock('ioredis', () => ({
  Redis: class {
    public connect = mockConnect;
    public disconnect = mockDisconnect;
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
  config: { host: 'redis.example.com', port: 6379, database: 0, ssl: 'required' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('default', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue({ rejectUnauthorized: true }),
  },
  ...overrides,
});

const lastOptions = (): Record<string, unknown> => mockConstructor.mock.calls[0][0];

describe('redisClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  it('has id "redis"', () => {
    expect(redisClientType.id).toBe('redis');
  });

  describe('build', () => {
    it('checks the allowed-hosts list before connecting', async () => {
      const networkSettings = makeNetworkSettings();

      await redisClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('redis.example.com');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('does not create a client when the host is not allowlisted', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn().mockImplementation(() => {
          throw new Error('Host not allowed');
        }),
      });

      await expect(redisClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
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

        await expect(redisClientType.build(ctx)).rejects.toThrow(PROXY_NOT_SUPPORTED_MESSAGE);
        expect(mockConstructor).not.toHaveBeenCalled();
        expect(ctx.credential.getAuthHeaders).not.toHaveBeenCalled();
      });

      it('connects directly when the host is in proxyBypassHosts', async () => {
        const networkSettings = proxied({ proxyBypassHosts: new Set(['redis.example.com']) });

        await redisClientType.build(makeCtx({ networkSettings }));

        expect(mockConstructor).toHaveBeenCalledTimes(1);
      });

      it('connects directly when the host is outside proxyOnlyHosts', async () => {
        const networkSettings = proxied({ proxyOnlyHosts: new Set(['other.example.com']) });

        await redisClientType.build(makeCtx({ networkSettings }));

        expect(mockConstructor).toHaveBeenCalledTimes(1);
      });
    });

    it('decodes username and password from the Basic Authorization header', async () => {
      await redisClientType.build(makeCtx({ credential: makeCredential('alice', 'p@ss:word') }));

      expect(lastOptions()).toMatchObject({ username: 'alice', password: 'p@ss:word' });
    });

    it('omits an empty username and password so no AUTH is sent', async () => {
      await redisClientType.build(makeCtx({ credential: makeCredential('', '') }));

      expect(lastOptions()).not.toHaveProperty('username');
      expect(lastOptions()).not.toHaveProperty('password');
    });

    it('passes host, port and database from config', async () => {
      await redisClientType.build(
        makeCtx({ config: { host: 'cache.corp', port: 6380, database: 3, ssl: 'disabled' } })
      );

      expect(lastOptions()).toMatchObject({ host: 'cache.corp', port: 6380, db: 3 });
    });

    it('passes an IPv6 address to the driver without brackets but checks the allowlist as configured', async () => {
      const networkSettings = makeNetworkSettings();
      await redisClientType.build(
        makeCtx({
          networkSettings,
          config: { host: '[2001:db8::1]', port: 6379, database: 0, ssl: 'required' },
        })
      );

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('[2001:db8::1]');
      expect(lastOptions()).toMatchObject({
        host: '2001:db8::1',
        tls: { servername: '2001:db8::1' },
      });
    });

    it('defaults the database to 0 and TLS to required', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true });
      const ctx = makeCtx({
        config: { host: 'cache.corp', port: 6379 },
        platform: { resolveSrvHosts: jest.fn(), buildTlsOptions },
      });

      await redisClientType.build(ctx);

      expect(lastOptions()).toMatchObject({ db: 0 });
      expect(lastOptions()).toHaveProperty('tls');
    });

    it('resolves TLS per host and port and passes it with the server name', async () => {
      const buildTlsOptions = jest.fn().mockReturnValue({ rejectUnauthorized: true, ca: 'CA-PEM' });
      const ctx = makeCtx({ platform: { resolveSrvHosts: jest.fn(), buildTlsOptions } });

      await redisClientType.build(ctx);

      expect(buildTlsOptions).toHaveBeenCalledWith(
        [{ hostname: 'redis.example.com', port: 6379 }],
        ctx.logger
      );
      expect(lastOptions().tls).toEqual({
        rejectUnauthorized: true,
        ca: 'CA-PEM',
        servername: 'redis.example.com',
      });
    });

    it('uses plain TCP and skips TLS settings when ssl is disabled', async () => {
      const buildTlsOptions = jest.fn();
      const ctx = makeCtx({
        config: { host: 'cache.corp', port: 6379, database: 0, ssl: 'disabled' },
        platform: { resolveSrvHosts: jest.fn(), buildTlsOptions },
      });

      await redisClientType.build(ctx);

      expect(lastOptions()).not.toHaveProperty('tls');
      expect(buildTlsOptions).not.toHaveBeenCalled();
    });

    it('applies the Actions timeout and does not reconnect behind the pool', async () => {
      await redisClientType.build(makeCtx());

      expect(lastOptions()).toMatchObject({
        connectTimeout: 60000,
        commandTimeout: 60000,
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
      });
      expect((lastOptions().retryStrategy as () => unknown)()).toBeNull();
    });

    it('records the Actions maximum response size on the client', async () => {
      const client = await redisClientType.build(makeCtx());

      expect(getResponseLimit(client)).toBe(10485760);
    });

    it('listens for connection errors so they are not unhandled', async () => {
      const ctx = makeCtx();

      await redisClientType.build(ctx);
      const listener = mockOn.mock.calls.find(([event]) => event === 'error')?.[1];
      listener(new Error('read ECONNRESET'));

      expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('read ECONNRESET'));
    });

    it('disconnects and rethrows when the connection cannot be established', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection is closed.'));

      await expect(redisClientType.build(makeCtx())).rejects.toThrow('Connection is closed.');
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('gives an empty AggregateError a readable message and keeps its code', async () => {
      const refused = Object.assign(new Error('connect ECONNREFUSED ::1:6379'), {
        code: 'ECONNREFUSED',
      });
      const refused4 = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:6379'), {
        code: 'ECONNREFUSED',
      });
      const aggregate = Object.assign(new AggregateError([refused, refused4], ''), {
        code: 'ECONNREFUSED',
      });
      mockConnect.mockImplementationOnce(() => {
        const listener = mockOn.mock.calls.find(([event]) => event === 'error')?.[1];
        listener(aggregate);
        return Promise.reject(new Error('Connection is closed.'));
      });

      const failure = await redisClientType.build(makeCtx()).catch((e: Error) => e);

      expect((failure as Error).message).toBe(
        'connect ECONNREFUSED ::1:6379; connect ECONNREFUSED 127.0.0.1:6379'
      );
      expect(redisClientType.isUserError?.(failure)).toBe(true);
    });

    it('throws the error behind a failed connect so a wrong host or port is a user error', async () => {
      // ioredis rejects connect() with a generic message and emits the real error, with its code, on 'error'.
      mockConnect.mockImplementationOnce(() => {
        const listener = mockOn.mock.calls.find(([event]) => event === 'error')?.[1];
        listener(
          Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:6379'), { code: 'ECONNREFUSED' })
        );
        return Promise.reject(new Error('Connection is closed.'));
      });

      const failure = await redisClientType.build(makeCtx()).catch((err: unknown) => err);

      expect(failure).toMatchObject({ code: 'ECONNREFUSED' });
      expect(redisClientType.isUserError?.(failure)).toBe(true);
    });
  });

  describe('terminate', () => {
    it('disconnects the client', async () => {
      const client = await redisClientType.build(makeCtx());

      await redisClientType.terminate(client);

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('isUserError', () => {
    it.each([
      'WRONGPASS invalid username-password pair or user is disabled.',
      'NOAUTH Authentication required.',
      'NOPERM this user has no permissions to run the command',
      'ERR AUTH <password> called without any password configured for the default user.',
      'ERR DB index is out of range',
    ])('classifies the reply %p as a user error', (message) => {
      expect(redisClientType.isUserError?.(new Error(message))).toBe(true);
    });

    it.each([
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'CERT_HAS_EXPIRED',
    ])('classifies %s as a user error', (code) => {
      expect(redisClientType.isUserError?.(Object.assign(new Error('boom'), { code }))).toBe(true);
    });

    it('classifies the proxy refusal as a user error', () => {
      expect(redisClientType.isUserError?.(new Error(PROXY_NOT_SUPPORTED_MESSAGE))).toBe(true);
    });

    it('does not classify other failures as user errors', () => {
      expect(redisClientType.isUserError?.(new Error('ERR unknown command'))).toBe(false);
      expect(redisClientType.isUserError?.('not an error')).toBe(false);
    });
  });

  describe('shouldInvalidateOnError', () => {
    it('invalidates the pooled client once its connection is closed', () => {
      expect(redisClientType.shouldInvalidateOnError?.(new Error('Connection is closed.'))).toBe(
        true
      );
    });

    it('keeps the client after an ordinary command error', () => {
      expect(
        redisClientType.shouldInvalidateOnError?.(new Error('WRONGTYPE Operation against a key'))
      ).toBe(false);
    });
  });
});
