/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomHostSettings, ProxySettings, SSLSettings } from '@kbn/actions-utils';
import type { Logger } from '@kbn/logging';

export interface ConnectorResponseSettings {
  timeout: number;
  maxContentLength: number;
}

/**
 * Outbound-network policy for a client type. The framework guarantees access to the policy;
 * each client type is responsible for applying it through its own library's native options
 * (see the new-client-type review guide).
 */
export interface ConnectorNetwork {
  /** Throws AllowlistDeniedError if the URL is not on xpack.actions.allowedHosts. */
  ensureUriAllowed(url: string): void;
  /** Throws AllowlistDeniedError if the hostname is not on xpack.actions.allowedHosts. */
  ensureHostnameAllowed(host: string): void;
  getSslSettings(): SSLSettings;
  getProxySettings(): ProxySettings | undefined;
  getCustomHostSettings(url: string): CustomHostSettings | undefined;
  getResponseSettings(): ConnectorResponseSettings;
  /** Cloud-aware User-Agent, matching what the axios path sends. */
  getUserAgent(): string;
}

export interface CredentialAccessor {
  getAuthHeaders(): Promise<Record<string, string>>;
}

export interface BuildContext {
  logger: Logger;
  config?: Record<string, unknown>;
  network: ConnectorNetwork;
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
