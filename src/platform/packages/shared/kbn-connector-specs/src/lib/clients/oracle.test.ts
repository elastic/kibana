/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateKeyPairSync } from 'crypto';
import forge from 'node-forge';
import { connect, createSecureContext, createServer } from 'tls';
import type { Logger } from '@kbn/logging';
import type { BuildContext } from './client_type_spec';
import { getResponseLimit } from './mssql_response_limit';
import { buildOracleTlsOptions, oracleClientType, PROXY_NOT_SUPPORTED_MESSAGE } from './oracle';

const mockPoolClose = jest.fn().mockResolvedValue(undefined);
const mockConnectionClose = jest.fn().mockResolvedValue(undefined);
const mockGetConnection = jest.fn();
const mockCreatePool = jest.fn();

jest.mock('oracledb', () => ({
  createPool: (options: unknown) => mockCreatePool(options),
}));

// A self-signed certificate and its key, standing in for a private CA or a database server.
const makeCertAndKey = (commonName: string): { cert: string; key: string } => {
  const { privateKey: key } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const privateKey = forge.pki.privateKeyFromPem(key);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.rsa.setPublicKey(privateKey.n, privateKey.e);
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 1000);
  cert.validity.notAfter = new Date(Date.now() + 86400000);
  cert.setSubject([{ name: 'commonName', value: commonName }]);
  cert.setIssuer([{ name: 'commonName', value: commonName }]);
  cert.sign(privateKey, forge.md.sha256.create());
  return { cert: forge.pki.certificateToPem(cert), key };
};

const makeLogger = () => {
  const warn = jest.fn();
  const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn } as unknown as Logger;
  return { logger, warn };
};

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

const makeCtx = (
  overrides: Partial<BuildContext> = {},
  tls: ReturnType<BuildContext['platform']['buildTlsOptions']> = { rejectUnauthorized: true }
): BuildContext => ({
  logger: makeLogger().logger,
  config: { host: 'db.example.com', port: 1521, serviceName: 'ORCLPDB1' },
  networkSettings: makeNetworkSettings(),
  credential: makeCredential('tester', 'secret'),
  platform: {
    resolveSrvHosts: jest.fn(),
    buildTlsOptions: jest.fn().mockReturnValue(tls),
  },
  ...overrides,
});

const lastPoolOptions = (): Record<string, unknown> => mockCreatePool.mock.calls[0][0];

describe('oracleClientType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnection.mockResolvedValue({ close: mockConnectionClose });
    mockCreatePool.mockResolvedValue({ close: mockPoolClose, getConnection: mockGetConnection });
  });

  it('has id "oracle"', () => {
    expect(oracleClientType.id).toBe('oracle');
  });

  describe('build', () => {
    it('checks the allowed-hosts list before opening a pool', async () => {
      const networkSettings = makeNetworkSettings();

      await oracleClientType.build(makeCtx({ networkSettings }));

      expect(networkSettings.ensureHostnameAllowed).toHaveBeenCalledWith('db.example.com');
      expect(mockCreatePool).toHaveBeenCalledTimes(1);
    });

    it('does not open a pool when the host is not allowed', async () => {
      const networkSettings = makeNetworkSettings({
        ensureHostnameAllowed: jest.fn(() => {
          throw new Error('not allowed');
        }),
      });

      await expect(oracleClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        'not allowed'
      );
      expect(mockCreatePool).not.toHaveBeenCalled();
    });

    it('refuses to connect when the host would be proxied', async () => {
      const networkSettings = makeNetworkSettings({
        getProxySettings: jest.fn().mockReturnValue({ proxyUrl: 'http://proxy:3128' }),
      });

      await expect(oracleClientType.build(makeCtx({ networkSettings }))).rejects.toThrow(
        PROXY_NOT_SUPPORTED_MESSAGE
      );
      expect(mockCreatePool).not.toHaveBeenCalled();
    });

    it('allows a direct connection to a host in proxyBypassHosts', async () => {
      const networkSettings = makeNetworkSettings({
        getProxySettings: jest.fn().mockReturnValue({
          proxyUrl: 'http://proxy:3128',
          proxyBypassHosts: new Set(['db.example.com']),
        }),
      });

      await oracleClientType.build(makeCtx({ networkSettings }));

      expect(mockCreatePool).toHaveBeenCalledTimes(1);
    });

    it('decodes basic-auth credentials and builds a tcps connect string by default', async () => {
      await oracleClientType.build(makeCtx());

      expect(lastPoolOptions()).toMatchObject({
        user: 'tester',
        password: 'secret',
        connectString: 'tcps://db.example.com:1521/ORCLPDB1',
        poolMin: 0,
        poolMax: 5,
      });
    });

    it('uses tcp and skips TLS setup when ssl is disabled', async () => {
      const ctx = makeCtx({
        config: { host: 'db.example.com', port: 1521, serviceName: 'ORCLPDB1', ssl: 'disabled' },
      });

      await oracleClientType.build(ctx);

      expect(lastPoolOptions().connectString).toBe('tcp://db.example.com:1521/ORCLPDB1');
      expect(ctx.platform.buildTlsOptions).not.toHaveBeenCalled();
      expect(lastPoolOptions()).not.toHaveProperty('walletContent');
      expect(lastPoolOptions()).not.toHaveProperty('sslServerDNMatch');
    });

    it('brackets an IPv6 literal in the connect string and the custom host lookup', async () => {
      const ctx = makeCtx({
        config: { host: '2001:db8::1', port: 1522, serviceName: 'SVC' },
      });

      await oracleClientType.build(ctx);

      expect(lastPoolOptions().connectString).toBe('tcps://[2001:db8::1]:1522/SVC');
      expect(ctx.platform.buildTlsOptions).toHaveBeenCalledWith(
        [{ hostname: '[2001:db8::1]', port: 1522 }],
        ctx.logger
      );
    });

    it('applies the Actions timeout as seconds for connecting and milliseconds per call', async () => {
      await oracleClientType.build(makeCtx());

      const options = lastPoolOptions();
      expect(options.transportConnectTimeout).toBe(60);
      expect(options.queueTimeout).toBe(60000);

      const connection: { callTimeout?: number } = {};
      const callback = jest.fn();
      (options.sessionCallback as (c: unknown, t: string, cb: () => void) => void)(
        connection,
        '',
        callback
      );
      expect(connection.callTimeout).toBe(60000);
      expect(callback).toHaveBeenCalled();
    });

    it('opens one connection so a bad login surfaces at build time', async () => {
      await oracleClientType.build(makeCtx());

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockConnectionClose).toHaveBeenCalledTimes(1);
    });

    it('closes the pool and rethrows when the first connection fails', async () => {
      const error = new Error('ORA-01017: invalid credential');
      mockGetConnection.mockRejectedValue(error);

      await expect(oracleClientType.build(makeCtx())).rejects.toBe(error);
      expect(mockPoolClose).toHaveBeenCalledWith(0);
    });

    it('records the Actions maximum response size on the pool', async () => {
      const pool = await oracleClientType.build(makeCtx());

      expect(getResponseLimit(pool)).toBe(10485760);
    });
  });

  describe('terminate', () => {
    it('closes the pool without waiting for in-use connections', async () => {
      await oracleClientType.terminate({ close: mockPoolClose } as never);

      expect(mockPoolClose).toHaveBeenCalledWith(0);
    });
  });

  describe('isUserError', () => {
    it.each([
      ['ORA-01017: invalid credential or not authorized'],
      ['ORA-28000: the account is locked'],
      ['ORA-12514: listener does not currently know of service'],
      ['NJS-503: connection to host db port 1521 could not be established.'],
      ['NJS-511: connection to host db:1521 refused'],
      ['NJS-518: cannot connect to database. Service "X" is not registered'],
      ['NJS-506: TLS authentication failed'],
    ])('classifies %s as a user error', (message) => {
      expect(oracleClientType.isUserError?.(new Error(message))).toBe(true);
    });

    it.each(['ECONNREFUSED', 'ENOTFOUND'])('classifies the %s code as a user error', (code) => {
      const err = Object.assign(new Error('connect failed'), { code });
      expect(oracleClientType.isUserError?.(err)).toBe(true);
    });

    it('classifies the proxy refusal as a user error', () => {
      expect(oracleClientType.isUserError?.(new Error(PROXY_NOT_SUPPORTED_MESSAGE))).toBe(true);
    });

    it('does not classify other failures as user errors', () => {
      expect(oracleClientType.isUserError?.(new Error('ORA-03113: end-of-file'))).toBe(false);
      expect(oracleClientType.isUserError?.(new Error('boom'))).toBe(false);
      expect(oracleClientType.isUserError?.('ORA-01017')).toBe(false);
    });
  });
});

describe('buildOracleTlsOptions', () => {
  const target = 'db.example.com:1521';

  it('sets no wallet when no custom CA is configured', async () => {
    const { logger, warn } = makeLogger();

    const options = await buildOracleTlsOptions({ rejectUnauthorized: true }, logger, target);

    expect(options).toEqual({ sslServerDNMatch: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it('skips the host name check in certificate verification mode', async () => {
    const options = await buildOracleTlsOptions(
      { rejectUnauthorized: true, checkServerIdentity: () => undefined },
      makeLogger().logger,
      target
    );

    expect(options.sslServerDNMatch).toBe(false);
  });

  it('warns that verification mode none is not supported and still verifies', async () => {
    const { logger, warn } = makeLogger();

    const options = await buildOracleTlsOptions({ rejectUnauthorized: false }, logger, target);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"none" is not supported'));
    expect(options.sslServerDNMatch).toBe(true);
  });

  it('trusts a custom CA alone by pairing it with an ephemeral identity the driver can load', async () => {
    const ca = makeCertAndKey('private-ca');

    const options = await buildOracleTlsOptions(
      { ca: Buffer.from(ca.cert) },
      makeLogger().logger,
      target
    );

    const wallet = options.walletContent ?? '';
    expect(wallet).toContain(ca.cert);
    expect(wallet).toMatch(/BEGIN (RSA )?PRIVATE KEY/);
    // The driver uses the wallet as cert, key, and ca at once; this is the call that rejects a CA-only PEM.
    expect(() => createSecureContext({ cert: wallet, key: wallet, ca: wallet })).not.toThrow();
  });

  describe('TLS handshake using the wallet the way the driver does', () => {
    // Connects to a local TLS server with a secure context built from the wallet; resolves to the error, if any.
    const handshake = async (wallet: string, server: { cert: string; key: string }) => {
      const tlsServer = createServer({ cert: server.cert, key: server.key }, (socket) =>
        socket.end()
      );
      await new Promise<void>((resolve) => tlsServer.listen(0, '127.0.0.1', resolve));
      try {
        const address = tlsServer.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        return await new Promise<Error | undefined>((resolve) => {
          const socket = connect({
            host: '127.0.0.1',
            port,
            secureContext: createSecureContext({ cert: wallet, key: wallet, ca: wallet }),
            rejectUnauthorized: true,
            checkServerIdentity: () => undefined,
          });
          socket.on('secureConnect', () => {
            socket.end();
            resolve(undefined);
          });
          socket.on('error', resolve);
        });
      } finally {
        await new Promise((resolve) => tlsServer.close(resolve));
      }
    };

    it('trusts a server whose certificate chains to the custom CA', async () => {
      const ca = makeCertAndKey('private-ca');
      const { walletContent } = await buildOracleTlsOptions(
        { ca: Buffer.from(ca.cert) },
        makeLogger().logger,
        target
      );

      expect(await handshake(walletContent ?? '', ca)).toBeUndefined();
    });

    it('rejects a server whose certificate does not chain to the custom CA', async () => {
      const ca = makeCertAndKey('private-ca');
      const other = makeCertAndKey('some-other-server');
      const { walletContent } = await buildOracleTlsOptions(
        { ca: Buffer.from(ca.cert) },
        makeLogger().logger,
        target
      );

      expect((await handshake(walletContent ?? '', other))?.message).toMatch(/self.signed|unable/i);
    });
  });
});
