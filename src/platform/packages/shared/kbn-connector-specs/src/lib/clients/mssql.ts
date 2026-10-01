/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectionPool } from 'mssql';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { setResponseLimit } from './mssql_response_limit';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// mssql error codes that indicate the user supplied bad configuration (not a transient network error).
const USER_ERROR_CODES = new Set([
  'ELOGIN', // wrong credentials, no access to the database, or the database does not exist
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
]);

export const mssqlClientType: ClientTypeSpec<ConnectionPool> = {
  id: 'mssql',

  async build(ctx: BuildContext): Promise<ConnectionPool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = ctx.config?.database as string;

    ctx.networkSettings.ensureHostnameAllowed(host);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout, maxContentLength } = ctx.networkSettings.getResponseSettings();

    // Merges the global xpack.actions.ssl settings with any matching customHostSettings entry for this host.
    const tls = ctx.platform.buildTlsOptions([{ hostname: host, port }], ctx.logger);
    if (tls.checkServerIdentity) {
      // tedious only exposes trustServerCertificate, so "certificate" mode (chain without hostname) cannot be honored.
      ctx.logger.warn(
        `[mssql] TLS verification mode "certificate" is not supported for ${host}:${port}; ` +
          'verifying the server hostname as well ("full")'
      );
    }

    ctx.logger.info(`[mssql] Opening connection pool for ${host}:${port}/${database}`);
    const lib = await import('mssql');
    const pool = new lib.ConnectionPool({
      server: host,
      port,
      database,
      user: username,
      password,
      connectionTimeout: timeout,
      requestTimeout: timeout,
      pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
      options: {
        // Azure SQL rejects unencrypted connections, so encryption is not configurable.
        encrypt: true,
        trustServerCertificate: tls.rejectUnauthorized === false,
        cryptoCredentialsDetails: {
          ...(tls.ca ? { ca: tls.ca } : {}),
          ...(tls.cert ? { cert: tls.cert } : {}),
          ...(tls.key ? { key: tls.key } : {}),
          ...(tls.passphrase ? { passphrase: tls.passphrase } : {}),
        },
      },
    });
    // Idle pooled connections can drop; without a listener the error would be unhandled.
    pool.on('error', (err) => {
      ctx.logger.warn(
        `[mssql] Connection pool error for ${host}:${port}/${database}: ${err.message}`
      );
    });
    await pool.connect();
    setResponseLimit(pool, maxContentLength);
    return pool;
  },

  async terminate(pool: ConnectionPool): Promise<void> {
    await pool.close();
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const { code = '' } = err as NodeJS.ErrnoException;
    return USER_ERROR_CODES.has(code);
  },
};
