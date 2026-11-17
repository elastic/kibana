/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Pool as OraclePool, PoolAttributes } from 'oracledb';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';
import { setResponseLimit } from './mssql_response_limit';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// Oracle / node-oracledb error codes that indicate the user supplied bad configuration (not a transient network error).
const USER_ERROR_CODES = new Set([
  'ORA-01017', // invalid username or password
  'ORA-01045', // user lacks CREATE SESSION privilege
  'ORA-28000', // account is locked
  'ORA-28001', // password has expired
  'ORA-12514', // listener does not know the requested service name
  'ORA-12505', // listener does not know the requested SID
  'ORA-12541', // no listener at the host and port
  'NJS-508', // TLS server certificate does not match the host
  'NJS-510', // connection to the host timed out
  'NJS-511', // connection refused: wrong host or port
  'NJS-515', // invalid Easy Connect string
  'NJS-518', // service name is not registered with the listener
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
]);

export const PROXY_NOT_SUPPORTED_MESSAGE =
  'Oracle connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the Oracle Net (TNS) protocol cannot be tunnelled through an HTTP(S) forward proxy. ' +
  "Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

// Appends the optional PEM material the Actions TLS settings supply to one wallet string. Thin mode accepts no
// other way to hand custom CA, client certificate or client key to the driver.
const toPemWallet = (parts: Array<string | Buffer | undefined>): string | undefined => {
  const pem = parts
    .filter((part): part is string | Buffer => part !== undefined)
    .map((part) => part.toString().trim())
    .filter((part) => part.length > 0);
  return pem.length > 0 ? pem.join('\n') : undefined;
};

export const oracleClientType: ClientTypeSpec<OraclePool> = {
  id: 'oracle',

  async build(ctx: BuildContext): Promise<OraclePool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const serviceName = ctx.config?.serviceName as string;
    const sslMode = (ctx.config?.ssl as 'required' | 'disabled' | undefined) ?? 'required';

    ctx.networkSettings.ensureHostnameAllowed(host);
    ensureNoProxyRequired(ctx, [{ hostname: host, port }], PROXY_NOT_SUPPORTED_MESSAGE);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout, maxContentLength } = ctx.networkSettings.getResponseSettings();
    const timeoutSeconds = Math.max(1, Math.ceil(timeout / 1000));

    const tlsAttributes: Partial<PoolAttributes> = {};
    if (sslMode === 'required') {
      const tls = ctx.platform.buildTlsOptions([{ hostname: host, port }], ctx.logger);
      if (tls.rejectUnauthorized === false) {
        // Thin mode always validates the server certificate chain; it has no switch to turn that off.
        ctx.logger.warn(
          `[oracle] TLS verification mode "none" is not supported for ${host}:${port}; ` +
            'the server certificate chain is still verified'
        );
      }
      const walletContent = toPemWallet([tls.ca as string | Buffer | undefined, tls.cert, tls.key]);
      tlsAttributes.sslServerDNMatch = !tls.checkServerIdentity;
      if (walletContent) {
        tlsAttributes.walletContent = walletContent;
        if (tls.passphrase) tlsAttributes.walletPassword = tls.passphrase;
      }
    }

    const protocol = sslMode === 'required' ? 'tcps' : 'tcp';
    ctx.logger.info(`[oracle] Opening connection pool for ${host}:${port}/${serviceName}`);
    // The dynamic import is a copy of the CommonJS exports once compiled, so the process-wide defaults below must
    // be set on `default`, the real module object.
    const { default: oracledb } = await import('oracledb');
    // Rows come back as objects keyed by column name, and CLOB values as strings rather than Lob streams (which
    // cannot be serialized into an action result). Kibana has no other oracledb consumer.
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.fetchAsString = [oracledb.CLOB, oracledb.NCLOB];
    const pool = await oracledb.createPool({
      user: username,
      password,
      connectString: `${protocol}://${host}:${port}/${serviceName}`,
      poolMin: 0,
      poolMax: 5,
      poolTimeout: 30,
      queueMax: 100,
      queueTimeout: timeout,
      transportConnectTimeout: timeoutSeconds,
      connectTimeout: timeoutSeconds,
      ...tlsAttributes,
    });
    setResponseLimit(pool, maxContentLength);
    return pool;
  },

  async terminate(pool: OraclePool): Promise<void> {
    await pool.close(0);
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.message === PROXY_NOT_SUPPORTED_MESSAGE) return true;
    const { code = '' } = err as NodeJS.ErrnoException;
    return USER_ERROR_CODES.has(code);
  },
};
