/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Pool } from 'pg';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';
import { setResponseLimit } from './postgresql_response_limit';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// Error codes that indicate the user supplied bad configuration (not a transient network error).
// PostgreSQL errors carry a SQLSTATE in `code`; connection and TLS failures carry a Node error code.
const USER_ERROR_CODES = new Set([
  '28P01', // invalid_password
  '28000', // invalid_authorization_specification (e.g. no pg_hba.conf entry)
  '3D000', // invalid_catalog_name: the database does not exist
  '42501', // insufficient_privilege
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
  'DEPTH_ZERO_SELF_SIGNED_CERT', // server certificate is not trusted
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID', // server certificate does not match the host
]);

// node-postgres raises this plain Error (no code) when TLS is required but the server refuses it.
const SSL_NOT_SUPPORTED_MESSAGE = 'The server does not support SSL connections';

// SQLSTATE classes 42 (syntax or access rule violation) and 22 (data exception) are mistakes in the caller's SQL.
const SQL_USER_ERROR_CLASS = /^(42|22)[0-9A-Z]{3}$/;

export const PROXY_NOT_SUPPORTED_MESSAGE =
  'PostgreSQL connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the PostgreSQL wire protocol cannot be tunnelled through an HTTP(S) forward proxy. ' +
  "Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

export const postgresqlClientType: ClientTypeSpec<Pool> = {
  id: 'postgresql',

  async build(ctx: BuildContext): Promise<Pool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = ctx.config?.database as string;
    const sslMode = (ctx.config?.ssl as 'required' | 'disabled' | undefined) ?? 'required';

    ctx.networkSettings.ensureHostnameAllowed(host);
    ensureNoProxyRequired(ctx, [{ hostname: host, port }], PROXY_NOT_SUPPORTED_MESSAGE);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout, maxContentLength } = ctx.networkSettings.getResponseSettings();

    // Merges the global xpack.actions.ssl settings with any matching customHostSettings entry for this host.
    // The result is a Node TLS options object, which node-postgres passes straight to `tls.connect`, so every
    // verification mode (including "certificate", which skips the hostname check) is honored.
    const ssl =
      sslMode === 'required'
        ? ctx.platform.buildTlsOptions([{ hostname: host, port }], ctx.logger)
        : false;

    ctx.logger.info(`[postgresql] Opening connection pool for ${host}:${port}/${database}`);
    const lib = await import('pg');
    const pool = new lib.Pool({
      host,
      port,
      database,
      user: username,
      password,
      ssl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: timeout,
      // Bound server-side and client-side execution to the Actions response timeout.
      statement_timeout: timeout,
      query_timeout: timeout,
      application_name: 'kibana',
    });
    // Idle pooled connections can drop; without a listener the error would be unhandled and crash the process.
    pool.on('error', (err) => {
      ctx.logger.warn(
        `[postgresql] Connection pool error for ${host}:${port}/${database}: ${err.message}`
      );
    });

    // Connect eagerly so bad credentials, a missing database or a TLS problem fail here (and are classified by
    // `isUserError`) rather than on the first action.
    try {
      const client = await pool.connect();
      client.release();
    } catch (err) {
      await pool.end().catch(() => undefined);
      throw err;
    }

    setResponseLimit(pool, maxContentLength);
    return pool;
  },

  async terminate(pool: Pool): Promise<void> {
    await pool.end();
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.message === PROXY_NOT_SUPPORTED_MESSAGE || err.message === SSL_NOT_SUPPORTED_MESSAGE) {
      return true;
    }
    const { code = '' } = err as NodeJS.ErrnoException;
    return USER_ERROR_CODES.has(code) || SQL_USER_ERROR_CLASS.test(code);
  },
};
