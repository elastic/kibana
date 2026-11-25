/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Pool as OraclePool } from 'oracledb';
import type { Logger } from '@kbn/logging';
import type { BuildContext, ClientTypeSpec, TlsConnectionOptions } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';
import { setResponseLimit } from './mssql_response_limit';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// Error codes that indicate the user supplied bad configuration (not a transient network error).
const USER_ERROR_CODES = new Set([
  'ORA-01017', // invalid username or password
  'ORA-01045', // the user lacks the CREATE SESSION privilege
  'ORA-28000', // the account is locked
  'ORA-28001', // the password has expired
  'ORA-12505', // the listener does not know the SID
  'ORA-12514', // the listener does not know the service name
  'ORA-12541', // no listener at that host and port
  'NJS-503', // the connection could not be established (wrong host or port, refused, or unreachable)
  'NJS-511', // connection refused (wrong host or port)
  'NJS-518', // the service name is not registered with the listener
  'NJS-505', // the TLS wallet could not be used
  'NJS-506', // the server certificate was not trusted
  'NJS-507', // the server certificate DN did not match
  'NJS-508', // the server certificate does not match the host name
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
]);

export const PROXY_NOT_SUPPORTED_MESSAGE =
  'Oracle Database connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the Oracle Net (TNS) protocol cannot be tunnelled through an HTTP(S) forward proxy. ' +
  "Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

const errorCode = (err: Error): string => {
  const { code } = err as NodeJS.ErrnoException;
  if (code) return code;
  return /^((?:ORA|NJS)-\d+)/.exec(err.message)?.[1] ?? '';
};

// Throwaway self-signed client identity. node-oracledb (Thin mode) passes one PEM string as the TLS `cert`, `key` and
// `ca` at once, so a wallet holding only trusted CAs fails to load ("no private key"). Pairing the CAs with an
// ephemeral identity lets a private CA be trusted. The identity is never trusted by anyone, so it only matters if a
// server requests a client certificate.
const generateEphemeralIdentityPem = async (): Promise<string> => {
  const forge = (await import('node-forge')).default;
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const subject = [{ name: 'commonName', value: 'kibana-oracle-client' }];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.sign(privateKey, forge.md.sha256.create());
  return `${forge.pki.certificateToPem(cert)}\n${forge.pki.privateKeyToPem(privateKey)}`;
};

export interface OracleTlsOptions {
  walletContent?: string;
  sslServerDNMatch: boolean;
}

/**
 * Maps the Kibana TLS options for a host onto the Thin-mode options.
 * - No custom CA (`xpack.actions.customHostSettings[n].ssl.certificateAuthoritiesData`): no wallet, so Node's
 *   default trusted roots apply.
 * - Custom CA: a PEM wallet of an ephemeral identity plus the CA, which then replaces the default roots.
 * - Verification mode "certificate" skips the host name check; "none" cannot be honored because the driver always
 *   verifies the chain, so it verifies fully and logs a warning.
 */
export const buildOracleTlsOptions = async (
  tls: TlsConnectionOptions,
  logger: Logger,
  target: string
): Promise<OracleTlsOptions> => {
  if (tls.rejectUnauthorized === false) {
    logger.warn(
      `[oracle] TLS verification mode "none" is not supported for ${target}; verifying the server certificate`
    );
  }
  const sslServerDNMatch = !tls.checkServerIdentity;
  if (!tls.ca) {
    return { sslServerDNMatch };
  }
  const identityPem = await generateEphemeralIdentityPem();
  return { walletContent: `${identityPem}\n${tls.ca.toString()}`, sslServerDNMatch };
};

// IPv6 literals must be bracketed in an Easy Connect string and in the URL used to look up custom host settings.
const formatHost = (host: string): string => (host.includes(':') ? `[${host}]` : host);

export const oracleClientType: ClientTypeSpec<OraclePool> = {
  id: 'oracle',

  async build(ctx: BuildContext): Promise<OraclePool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const serviceName = ctx.config?.serviceName as string;
    const useTls = ctx.config?.ssl !== 'disabled';

    ctx.networkSettings.ensureHostnameAllowed(host);
    ensureNoProxyRequired(ctx, [{ hostname: host, port }], PROXY_NOT_SUPPORTED_MESSAGE);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout, maxContentLength } = ctx.networkSettings.getResponseSettings();

    const hostPart = formatHost(host);
    const tlsOptions = useTls
      ? await buildOracleTlsOptions(
          ctx.platform.buildTlsOptions([{ hostname: hostPart, port }], ctx.logger),
          ctx.logger,
          `${host}:${port}`
        )
      : undefined;

    ctx.logger.info(`[oracle] Opening connection pool for ${host}:${port}/${serviceName}`);
    const lib = await import('oracledb');
    const pool = await lib.createPool({
      user: username,
      password,
      connectString: `${useTls ? 'tcps' : 'tcp'}://${hostPart}:${port}/${serviceName}`,
      poolMin: 0,
      poolMax: 5,
      poolTimeout: 30,
      queueMax: 100,
      queueTimeout: timeout,
      // oracledb takes connect timeouts in seconds, and the per-round-trip call timeout in milliseconds.
      transportConnectTimeout: Math.max(1, Math.ceil(timeout / 1000)),
      // Runs once per new session: the call timeout then applies to every borrow of that connection.
      sessionCallback: (connection, _requestedTag, callback) => {
        connection.callTimeout = timeout;
        callback();
      },
      ...(tlsOptions
        ? {
            sslServerDNMatch: tlsOptions.sslServerDNMatch,
            ...(tlsOptions.walletContent ? { walletContent: tlsOptions.walletContent } : {}),
          }
        : {}),
    });
    // With poolMin 0 nothing connects yet; open one connection now so bad credentials, an unknown service name or
    // a TLS failure surface at build time (where isUserError applies) instead of on the first action.
    try {
      const connection = await pool.getConnection();
      await connection.close();
    } catch (err) {
      await pool.close(0).catch(() => undefined);
      throw err;
    }
    setResponseLimit(pool, maxContentLength);
    return pool;
  },

  async terminate(pool: OraclePool): Promise<void> {
    await pool.close(0);
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.message === PROXY_NOT_SUPPORTED_MESSAGE) return true;
    return USER_ERROR_CODES.has(errorCode(err));
  },
};
