/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CustomHostSettings,
  ProxySettings,
  SSLSettings,
  getNodeSSLOptions,
} from '@kbn/actions-utils';
import type { Logger } from '@kbn/logging';

export interface ConnectorResponseSettings {
  timeout: number;
  maxContentLength: number;
}

export type TlsConnectionOptions = ReturnType<typeof getNodeSSLOptions>;

/**
 * The Kibana `xpack.actions.*` outbound-network settings, handed to a client type unchanged.
 *
 * These are the same settings the axios path applies via `get_axios_instance`. The framework only
 * makes them reachable; each client type is responsible for applying them through its own
 * library's native options. `ensure*` and `resolveSrvHosts` are the exception: they are checks
 * (or, for `resolveSrvHosts`, a Node-builtin-backed lookup) rather than plain values, because the
 * `allowedHosts` matching logic and DNS resolution live in the Actions plugin and cannot be
 * re-implemented in this package — this package is isomorphic (`shared-common`) and may not
 * import Node builtins, even dynamically.
 */
export interface ConnectorNetworkSettings {
  /** Throws AllowlistDeniedError if the URL is not on xpack.actions.allowedHosts. */
  ensureUriAllowed(url: string): void;
  /** Throws AllowlistDeniedError if the hostname is not on xpack.actions.allowedHosts. */
  ensureHostnameAllowed(host: string): void;
  /**
   * Resolves `_<serviceName>._tcp.<name>` SRV records (serviceName defaults to `mongodb`, matching
   * the MongoDB driver's default). Client types for DNS-seedlist schemes (e.g. `mongodb+srv://`)
   * must resolve and validate the real target hosts through this — the seed name alone is not the
   * host that gets connected to.
   */
  resolveSrvHosts(
    name: string,
    serviceName?: string
  ): Promise<Array<{ name: string; port: number }>>;
  getSslSettings(): SSLSettings;
  getProxySettings(): ProxySettings | undefined;
  getCustomHostSettings(url: string): CustomHostSettings | undefined;
  getResponseSettings(): ConnectorResponseSettings;
  /** Builds Node TLS connection options; routed through here to keep Node-only imports server-side. */
  getTlsOptions(
    logger: Logger,
    verificationMode: string | undefined,
    sslOverrides: SSLSettings
  ): TlsConnectionOptions;
}

export interface CredentialAccessor {
  getAuthHeaders(): Promise<Record<string, string>>;
}

export interface BuildContext {
  logger: Logger;
  config?: Record<string, unknown>;
  networkSettings: ConnectorNetworkSettings;
  credential: CredentialAccessor;
}

export interface ClientTypeSpec<TClient> {
  id: string;
  build(ctx: BuildContext): Promise<TClient>;
  /** Called when evicting a pooled instance (connector delete, TTL, etc.). */
  terminate(client: TClient): Promise<void>;
  /**
   * Optional: return true to classify a connect failure as a USER error (bad config, auth).
   * Boolean rather than TaskErrorSource because this package cannot import TaskErrorSource
   * (shared-common cannot depend on a plugin).
   * Only ever promotes to USER; FRAMEWORK is the default for unclassified failures.
   */
  isUserError?(err: unknown): boolean;
}
