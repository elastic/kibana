/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MongoClient } from 'mongodb';
import type { ConnectionString as ConnectionStringType } from 'mongodb-connection-string-url';
import type { BuildContext, ClientTypeSpec } from './client_type_spec';
import { loadConnectionString } from './load_connection_string';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

// mongodb:// URIs may list multiple hosts (replica sets, sharded clusters) and the driver
// connects to all of them, so every one must clear the network guard. mongodb+srv:// URIs
// list only a single DNS seed name — the driver itself resolves the real target hosts from
// `_<srvServiceName>._tcp.<seed>` SRV records at connect() time. Validating the seed name
// alone would let an SRV record repoint the connection at any host, bypassing the allowlist
// entirely, so the SRV records are resolved here and every target they name is checked too.
const ensureHostsAllowed = async (
  ctx: BuildContext,
  connectionString: ConnectionStringType
): Promise<void> => {
  if (!connectionString.isSRV) {
    for (const hostPort of connectionString.hosts) {
      const { hostname } = new URL(`http://${hostPort}`);
      ctx.networkSettings.ensureHostnameAllowed(hostname);
    }
    return;
  }

  const [seedHost] = connectionString.hosts;
  const { hostname: seedHostname } = new URL(`http://${seedHost}`);
  ctx.networkSettings.ensureHostnameAllowed(seedHostname);

  const srvServiceName = connectionString.searchParams.get('srvServiceName') ?? 'mongodb';
  let records;
  try {
    records = await ctx.networkSettings.resolveSrvHosts(seedHostname, srvServiceName);
  } catch (err) {
    throw new Error(
      `failed to resolve SRV records for "${seedHostname}": ${(err as Error).message}`
    );
  }
  if (records.length === 0) {
    throw new Error(`no SRV records found for "${seedHostname}"`);
  }
  for (const record of records) {
    ctx.networkSettings.ensureHostnameAllowed(record.name);
  }
};

export const mongodbClientType: ClientTypeSpec<MongoClient> = {
  id: 'mongodb',

  async build(ctx) {
    const uri = typeof ctx.config?.uri === 'string' ? ctx.config.uri : undefined;
    if (!uri) {
      throw new Error('config.uri is required');
    }

    const ConnectionString = await loadConnectionString();
    const connectionString = new ConnectionString(uri);

    await ensureHostsAllowed(ctx, connectionString);

    const authHeaders = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(authHeaders.Authorization ?? '');
    if (!credentials || !credentials.username || !credentials.password) {
      throw new Error(
        'basic auth credentials (username and password) are required for MongoDB connections'
      );
    }

    const { MongoClient: MongoClientCtor } = await import(
      /* webpackChunkName: "mongodbDriver" */ 'mongodb'
    );
    const client = new MongoClientCtor(uri, {
      auth: { username: credentials.username, password: credentials.password },
      // Default to admin so credentials created there work without ?authSource=admin in the URI.
      // The driver gives programmatic options precedence over the connection string, so only
      // apply this default when the URI omits authSource — otherwise ?authSource=<db> in the URI
      // (which the help text and docs tell users to use) would be silently ignored.
      ...(connectionString.searchParams.has('authSource') ? {} : { authSource: 'admin' }),
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      // Bounds in-flight query execution; prevents a runaway scan from holding a pooled
      // connection indefinitely and starving other calls that reuse the same client.
      timeoutMS: 30_000,
    });
    await client.connect();
    return client;
  },

  async terminate(client) {
    await client.close();
  },

  isUserError(err: unknown): boolean {
    if (err instanceof Error) {
      if (
        err.message === 'config.uri is required' ||
        err.message ===
          'basic auth credentials (username and password) are required for MongoDB connections'
      ) {
        return true;
      }
      // instanceof checks can't be used here because static imports of the mongodb driver
      // and mongodb-connection-string-url are intentionally avoided to keep this module
      // browser-bundle-safe.
      if (err.constructor.name === 'MongoServerError') {
        // 18 = AuthenticationFailed, 13 = Unauthorized
        const code = (err as { code?: number }).code;
        return code === 18 || code === 13;
      }
      // Thrown by mongodb-connection-string-url when config.uri is malformed — a
      // configuration mistake, not a framework failure.
      if (err.constructor.name === 'MongoParseError') {
        return true;
      }
    }
    return false;
  },
};
