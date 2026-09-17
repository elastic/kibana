/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNodeSSLOptions } from '@kbn/actions-utils';
import type { Pool as Mysql2Pool, SslOptions } from 'mysql2/promise';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';

// mysql2 error codes that indicate the user supplied bad configuration (not a transient network error).
const USER_ERROR_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR', // wrong credentials
  'ER_DBACCESS_DENIED_ERROR', // no access to specified database
  'ER_BAD_DB_ERROR', // database does not exist
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
]);

const extractBasicCredentials = async (
  credential: BuildContext['credential']
): Promise<{ username: string; password: string }> => {
  const headers = await credential.getAuthHeaders();
  const authHeader = headers.Authorization ?? headers.authorization ?? '';
  const encoded = authHeader.startsWith('Basic ') ? authHeader.slice(6) : '';
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  return {
    username: colonIdx >= 0 ? decoded.slice(0, colonIdx) : decoded,
    password: colonIdx >= 0 ? decoded.slice(colonIdx + 1) : '',
  };
};

const toMysqlSslOptions = (ctx: BuildContext): SslOptions => {
  const sslSettings = ctx.networkSettings.getSslSettings();
  const verificationMode = sslSettings.verificationMode ?? 'full';
  const nodeSsl = getNodeSSLOptions(ctx.logger, verificationMode, sslSettings);

  const ssl: SslOptions = {
    rejectUnauthorized: nodeSsl.rejectUnauthorized ?? true,
    // 'full' checks hostname; 'certificate' and 'none' do not.
    verifyIdentity: verificationMode === 'full',
  };
  if (nodeSsl.ca) ssl.ca = nodeSsl.ca;
  if (nodeSsl.cert) ssl.cert = nodeSsl.cert;
  if (nodeSsl.key) ssl.key = nodeSsl.key;
  if (nodeSsl.passphrase) ssl.passphrase = nodeSsl.passphrase;
  return ssl;
};

export const mysqlClientType: ClientTypeSpec<Mysql2Pool> = {
  id: 'mysql',

  async build(ctx: BuildContext): Promise<Mysql2Pool> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = ctx.config?.database as string;
    const sslMode = (ctx.config?.ssl as 'required' | 'disabled' | undefined) ?? 'required';

    ctx.networkSettings.ensureHostnameAllowed(host);

    const { username, password } = await extractBasicCredentials(ctx.credential);
    const { timeout } = ctx.networkSettings.getResponseSettings();

    ctx.logger.info(`[mysql] Opening connection pool for ${host}:${port}/${database}`);
    const lib = await import('mysql2/promise');
    return lib.createPool({
      host,
      port,
      database,
      user: username,
      password,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 100,
      connectTimeout: timeout,
      disableEval: true,
      ...(sslMode === 'required' ? { ssl: toMysqlSslOptions(ctx) } : {}),
    });
  },

  async terminate(pool: Mysql2Pool): Promise<void> {
    await pool.end();
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const code = (err as NodeJS.ErrnoException).code ?? '';
    return USER_ERROR_CODES.has(code);
  },
};
