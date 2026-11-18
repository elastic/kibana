/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Redis } from 'ioredis';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { ensureNoProxyRequired } from './ensure_no_proxy_required';
import { setResponseLimit } from './mssql_response_limit';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// Reply errors start with an error code in capitals; these mean the user supplied bad credentials or configuration.
const USER_REPLY_ERROR_PREFIXES = [
  'WRONGPASS', // wrong username or password
  'NOAUTH', // the server requires authentication
  'NOPERM', // the ACL user may not run the command
  'ERR invalid password',
  'ERR AUTH', // AUTH sent to a server with no password configured
  'ERR DB index is out of range',
  'ERR invalid DB index',
];

// Network and TLS error codes that indicate wrong host, port or certificate settings.
const USER_ERROR_CODES = new Set([
  'ECONNREFUSED', // wrong host or port
  'ENOTFOUND', // hostname cannot be resolved
  'ERR_TLS_CERT_ALTNAME_INVALID', // certificate does not match the host
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
]);

export const PROXY_NOT_SUPPORTED_MESSAGE =
  'Redis connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the Redis (RESP) protocol cannot be tunnelled through an HTTP(S) forward proxy. ' +
  "Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

export const redisClientType: ClientTypeSpec<Redis> = {
  id: 'redis',

  async build(ctx: BuildContext): Promise<Redis> {
    const host = ctx.config?.host as string;
    const port = ctx.config?.port as number;
    const database = (ctx.config?.database as number | undefined) ?? 0;
    const sslMode = (ctx.config?.ssl as 'required' | 'disabled' | undefined) ?? 'required';

    ctx.networkSettings.ensureHostnameAllowed(host);
    ensureNoProxyRequired(ctx, [{ hostname: host, port }], PROXY_NOT_SUPPORTED_MESSAGE);

    const headers = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(headers.Authorization ?? headers.authorization ?? '');
    const { username = '', password = '' } = credentials ?? {};
    const { timeout, maxContentLength } = ctx.networkSettings.getResponseSettings();

    // Merges the global xpack.actions.ssl settings with any matching customHostSettings entry for this host.
    const tls =
      sslMode === 'required'
        ? ctx.platform.buildTlsOptions([{ hostname: host, port }], ctx.logger)
        : undefined;

    ctx.logger.info(`[redis] Opening connection for ${host}:${port}/${database}`);
    const { Redis: RedisClient } = await import('ioredis');
    const client = new RedisClient({
      host,
      port,
      db: database,
      // Redis versions before 6 have a password only; the ACL user name "default" is the same account.
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
      ...(tls ? { tls: { ...tls, servername: host } } : {}),
      connectTimeout: timeout,
      commandTimeout: timeout,
      lazyConnect: true,
      // The lease pool replaces a client that fails; a client that reconnects behind its back would hide that.
      retryStrategy: () => null,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
    // Without a listener an error on an idle connection would be an unhandled event. It also keeps the
    // cause of a failed connect: with reconnects off, connect() rejects with a generic "Connection is closed"
    // and the error carrying the code (ECONNREFUSED, ENOTFOUND, a TLS code) is only emitted here.
    let lastError: Error | undefined;
    client.on('error', (err: Error) => {
      lastError = err;
      ctx.logger.warn(`[redis] Connection error for ${host}:${port}/${database}: ${err.message}`);
    });
    try {
      await client.connect();
    } catch (err) {
      client.disconnect();
      throw lastError ?? err;
    }
    setResponseLimit(client, maxContentLength);
    return client;
  },

  async terminate(client: Redis): Promise<void> {
    client.disconnect();
  },

  isUserError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (err.message === PROXY_NOT_SUPPORTED_MESSAGE) return true;
    const { code = '' } = err as NodeJS.ErrnoException;
    if (USER_ERROR_CODES.has(code)) return true;
    return USER_REPLY_ERROR_PREFIXES.some((prefix) => err.message.startsWith(prefix));
  },

  // With reconnects disabled, a dropped connection stays dropped; the pooled client must be replaced.
  shouldInvalidateOnError(err: unknown): boolean {
    return err instanceof Error && /connection is closed/i.test(err.message);
  },
};
