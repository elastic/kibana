/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Pool as PgPool, PoolConfig } from 'pg';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// Error codes that indicate the user supplied bad configuration (not a transient network error).
// The first four are PostgreSQL SQLSTATE values; the rest are Node socket errors.
const USER_ERROR_CODES = new Set([
  '28000', // invalid_authorization_specification (no pg_hba.conf entry, role not permitted)
  '28P01', // invalid_password
  '3D000', // invalid_catalog_name (database does not exist)
  '42501', // insufficient_privilege (no CONNECT on the database)
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
]);

// node-postgres raises this without a code when TLS is required but the server has none.
const TLS_NOT_SUPPORTED_MESSAGE = 'The server does not support SSL connections';

export const PROXY_NOT_SUPPORTED_MESSAGE =
  'PostgreSQL connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the PostgreSQL wire protocol cannot be tunnelled through an HTTP(S) forward proxy. ' +
  "Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

const toPgSslOptions = (ctx: BuildContext, host: string, port: number): PoolConfig['ssl'] => {
  // Merges the global xpack.actions.ssl settings with any matching customHostSettings entry for this host.
  const tls = ctx.platform.buildTlsOptions([{ hostname: host, port }], ctx.logger);
  return {
    rejectUnauthorized: tls.rejectUnauthorized ?? true,
    // Only set in "certificate" mode: verify the chain but not the hostname.
    ...(tls.checkServerIdentity ? { checkServerIdentity: tls.checkServerIdentity } : {}),
    ...(tls.ca ? { ca: tls.ca } : {}),
    ...(tls.cert ? { cert: tls.cert } : {}),
    ...(tls.key ? { key: tls.key } : {}),
    ...(tls.passphrase ? { passphrase: tls.passphrase } : {}),
  };
};

export const postgresClientType: ClientTypeSpec<PgPool> = {
  id: 'postgres',

  async build(ctx: BuildContext): Promise<PgPool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = ctx.config?.database as string;
    const sslMode = (ctx.config?.ssl as 'required' | 'disabled' | undefined) ?? 'required';

    ctx.networkSettings.ensureHostnameAllowed(host);
    ensureNoProxyRequired(ctx, [{ hostname: host, port }], PROXY_NOT_SUPPORTED_MESSAGE);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout } = ctx.networkSettings.getResponseSettings();

    ctx.logger.info(`[postgres] Opening connection pool for ${host}:${port}/${database}`);
    const { Pool } = await import('pg');
    const pool = new Pool({
      host,
      port,
      database,
      user: username,
      password,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: timeout,
      // Server-side cap so a runaway statement cannot hold a pooled connection indefinitely.
      statement_timeout: timeout,
      application_name: 'kibana',
      ssl: sslMode === 'required' ? toPgSslOptions(ctx, host, port) : false,
    });
    // Idle pooled connections can drop; without a listener the error would be unhandled and crash the process.
    pool.on('error', (err) => {
      ctx.logger.warn(
        `[postgres] Connection pool error for ${host}:${port}/${database}: ${err.message}`
      );
    });
    return pool;
  },

  async terminate(pool: PgPool): Promise<void> {
    await pool.end();
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.message === PROXY_NOT_SUPPORTED_MESSAGE || err.message === TLS_NOT_SUPPORTED_MESSAGE) {
      return true;
    }
    const { code = '' } = err as NodeJS.ErrnoException;
    return USER_ERROR_CODES.has(code);
  },
};
