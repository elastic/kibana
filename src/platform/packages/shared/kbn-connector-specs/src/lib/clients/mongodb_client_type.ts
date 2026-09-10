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
import type { BuildContext, ClientTypeSpec, HostTarget } from './client_type_spec';
import { loadConnectionString } from './load_connection_string';
import { parseBasicAuthHeader } from './parse_basic_auth_header';

interface ResolvedHosts {
  /** Every target that was checked against the allowlist. */
  targets: HostTarget[];
  /** Present only for mongodb+srv:// connections: the SRV-resolved connect targets. */
  srvTargets?: HostTarget[];
}

// mongodb:// URIs may list multiple hosts (replica sets, sharded clusters) and the driver
// connects to all of them, so every one must clear the network guard. mongodb+srv:// URIs
// list only a single DNS seed name — the driver itself resolves the real target hosts from
// `_<srvServiceName>._tcp.<seed>` SRV records at connect() time. Validating the seed name
// alone would let an SRV record repoint the connection at any host, bypassing the allowlist
// entirely, so the SRV records are resolved here and every target they name is checked too.
const ensureHostsAllowed = async (
  ctx: BuildContext,
  connectionString: ConnectionStringType
): Promise<ResolvedHosts> => {
  if (!connectionString.isSRV) {
    const targets = connectionString.hosts.map((hostPort) => {
      const { hostname, port } = new URL(`http://${hostPort}`);
      return { hostname, port: port ? Number(port) : 27017 };
    });
    for (const { hostname } of targets) {
      ctx.networkSettings.ensureHostnameAllowed(hostname);
    }
    return { targets };
  }

  const [seedHost] = connectionString.hosts;
  const { hostname: seedHostname } = new URL(`http://${seedHost}`);
  ctx.networkSettings.ensureHostnameAllowed(seedHostname);

  const srvServiceName = connectionString.searchParams.get('srvServiceName') ?? 'mongodb';
  let records;
  try {
    records = await ctx.platform.resolveSrvHosts(seedHostname, srvServiceName);
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
  const srvTargets = records.map(({ name, port }) => ({ hostname: name, port }));
  return { targets: srvTargets, srvTargets };
};

/**
 * Rebuild the connection string against the exact SRV targets just validated, instead of handing
 * the driver the original mongodb+srv:// URI. The driver performs its own independent SRV
 * resolution when connecting a +srv URI — reusing the validated hostnames here closes a
 * DNS-rebinding window where an attacker-controlled DNS zone could answer the allowlist check
 * with permitted hosts, then repoint the SRV records at a disallowed host before the driver's
 * own resolution moments later.
 *
 * mongodb+srv:// implies TLS by default, so that default is preserved explicitly since a plain
 * mongodb:// URI does not carry it. DNS TXT-record-provided defaults (replicaSet, authSource)
 * are no longer consulted once the +srv scheme is dropped — the driver still auto-discovers
 * replica-set topology from the resolved hosts without an expected replicaSet name.
 *
 * Residual trust: after connecting, the MongoDB driver performs Server Discovery and Monitoring
 * (SDAM) — it reads the `hello` response from each host and opens connections to any additional
 * replica-set members advertised there. Those discovered hostnames are not re-checked against
 * xpack.actions.allowedHosts. This means the allowlist check trusts allowlisted MongoDB endpoints
 * not to advertise internal hostnames. Operators who need to prevent topology discovery entirely
 * (for example, on standalone instances) can append `?directConnection=true` to the connection
 * URI, which instructs the driver to connect to exactly the one seed host and skip SDAM.
 */
const pinToResolvedHosts = (
  connectionString: ConnectionStringType,
  srvTargets: HostTarget[]
): string => {
  const pinned = connectionString.clone();
  pinned.protocol = 'mongodb:';
  pinned.hosts = srvTargets.map(({ hostname, port }) => `${hostname}:${port}`);
  if (!pinned.searchParams.has('tls') && !pinned.searchParams.has('ssl')) {
    pinned.searchParams.set('tls', 'true');
  }
  return pinned.toString();
};

const PROXY_NOT_SUPPORTED_MESSAGE =
  'MongoDB connections cannot be routed through the configured xpack.actions.proxyUrl: ' +
  'the MongoDB driver only supports a SOCKS5 proxy (proxyHost/proxyPort), not an HTTP(S) forward ' +
  "proxy. Add the connector's host to xpack.actions.proxyBypassHosts to allow a direct connection.";

/**
 * Rather than silently connecting without the platform's configured egress proxy (a silent
 * policy downgrade), fail loudly: the MongoDB wire protocol cannot be tunnelled through the
 * HTTP(S) CONNECT proxy that xpack.actions.proxyUrl configures for the Axios connector path.
 */
const ensureNoProxyRequired = (ctx: BuildContext, targets: HostTarget[]): void => {
  const proxySettings = ctx.networkSettings.getProxySettings();
  if (!proxySettings) return;

  const isProxied = targets.some(({ hostname }) => {
    if (proxySettings.proxyBypassHosts?.has(hostname)) return false;
    if (proxySettings.proxyOnlyHosts && !proxySettings.proxyOnlyHosts.has(hostname)) return false;
    return true;
  });
  if (isProxied) {
    throw new Error(PROXY_NOT_SUPPORTED_MESSAGE);
  }
};

const URI_REQUIRED_MESSAGE = 'config.uri is required';
const INVALID_URI_MESSAGE = 'config.uri is not a valid MongoDB connection string';
const CREDENTIALS_REQUIRED_MESSAGE =
  'basic auth credentials (username and password) are required for MongoDB connections';
const EMBEDDED_CREDENTIALS_MESSAGE =
  'config.uri must not contain embedded credentials — use the username and password fields instead';
// One shared set of literals for both the throw sites in build() and the classification in
// isUserError below, so the two can't silently drift apart (a message edit in one place would
// otherwise stop matching the other with no compile-time signal).
const USER_ERROR_MESSAGES: ReadonlySet<string> = new Set([
  URI_REQUIRED_MESSAGE,
  INVALID_URI_MESSAGE,
  CREDENTIALS_REQUIRED_MESSAGE,
  EMBEDDED_CREDENTIALS_MESSAGE,
  PROXY_NOT_SUPPORTED_MESSAGE,
]);

export const mongodbClientType: ClientTypeSpec<MongoClient> = {
  id: 'mongodb',

  async build(ctx) {
    const uri = typeof ctx.config?.uri === 'string' ? ctx.config.uri : undefined;
    if (!uri) {
      throw new Error(URI_REQUIRED_MESSAGE);
    }

    const ConnectionString = await loadConnectionString();
    let connectionString;
    try {
      connectionString = new ConnectionString(uri);
    } catch {
      // Discard the parse error: it may include the raw URI, which could contain an embedded
      // password if the user pasted a full connection string. Throw a generic message instead.
      throw new Error(INVALID_URI_MESSAGE);
    }

    // config.uri is stored as unencrypted connector config, not a secret. A URI with
    // embedded userinfo (mongodb://user:pass@host/db) would persist that password in
    // plaintext alongside the encrypted basic-auth secrets — reject it and make the
    // caller use the separate username/password fields instead. Check before allowlist/proxy
    // so no downstream function ever receives a URI that carries a password.
    if (connectionString.username || connectionString.password) {
      throw new Error(EMBEDDED_CREDENTIALS_MESSAGE);
    }

    const { targets, srvTargets } = await ensureHostsAllowed(ctx, connectionString);
    ensureNoProxyRequired(ctx, targets);

    const authHeaders = await ctx.credential.getAuthHeaders();
    const credentials = parseBasicAuthHeader(authHeaders.Authorization ?? '');
    if (!credentials || !credentials.username || !credentials.password) {
      throw new Error(CREDENTIALS_REQUIRED_MESSAGE);
    }

    // Connect to the already-validated SRV targets directly rather than handing the driver the
    // original mongodb+srv:// URI, which would trigger its own independent (unvalidated) SRV
    // resolution — see pinToResolvedHosts for why.
    const connectUri = srvTargets ? pinToResolvedHosts(connectionString, srvTargets) : uri;
    const tlsOptions = ctx.platform.buildTlsOptions(targets, ctx.logger);

    const { MongoClient: MongoClientCtor } = await import(
      /* webpackChunkName: "mongodbDriver" */ 'mongodb'
    );
    const client = new MongoClientCtor(connectUri, {
      ...tlsOptions,
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
      if (USER_ERROR_MESSAGES.has(err.message)) {
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
