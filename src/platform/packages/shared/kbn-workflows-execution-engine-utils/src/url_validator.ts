/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface UrlValidatorConfig {
  allowedHosts: string[];
  /**
   * Protocols that are considered valid. Requests using any other scheme are
   * rejected before hostname checking even begins.
   *
   * Defaults to `['http:', 'https:']`.
   *
   * Note: setting `allowedHosts` to `['*']` disables hostname allowlisting
   * (any hostname is accepted), but `allowedProtocols` is still enforced.
   */
  allowedProtocols?: string[];
}

const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates whether a URL is reachable under the current workflow configuration.
 *
 * SECURITY CONTRACT
 * -----------------
 * - Only URLs whose *scheme* appears in `allowedProtocols` are considered.
 *   This prevents `file:`, `javascript:`, `data:`, etc. from slipping through.
 * - Hostname checking is performed against `allowedHosts`. Use `allowedHosts: ['*']`
 *   to disable hostname filtering (all hostnames allowed for the permitted protocols).
 *   **When `allowedHosts` contains `'*'`, the wildcard bypasses hostname validation
 *   entirely — only set this in development or trusted-network environments.**
 * - No SSRF / RFC 1918 protection is applied at this layer; that is delegated to
 *   the actions plugin `allowedHosts` config and network policy. A future
 *   `denyPrivateNetworks` option is reserved for opt-in SSRF mitigation.
 *
 * Use `UrlValidator.fromConfig` to build a shared, immutable instance rather than
 * constructing a new validator per request.
 */
export class UrlValidator {
  private readonly allowedHosts: Set<string>;
  private readonly allowedProtocols: Set<string>;

  constructor(config: UrlValidatorConfig) {
    this.allowedHosts = new Set(config.allowedHosts);
    this.allowedProtocols = new Set(config.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS);
  }

  /** Build a shared validator from configuration. Prefer this over `new UrlValidator(...)` to
   *  avoid rebuilding the internal Sets on every request. */
  static fromConfig(config: UrlValidatorConfig): UrlValidator {
    return new UrlValidator(config);
  }

  /**
   * Parses a URL string into a URL object.
   * Returns `null` for protocol-relative, unparseable, or scheme-blocked URLs.
   */
  parseUrl(uri: string): URL | null {
    try {
      if (uri.startsWith('//')) {
        return null;
      }

      const parsedUrl = new URL(uri);
      if (!parsedUrl.hostname) {
        return null;
      }

      if (!this.allowedProtocols.has(parsedUrl.protocol)) {
        return null;
      }

      return parsedUrl;
    } catch {
      return null;
    }
  }

  /** Returns `true` when the URL's scheme and hostname are both allowed. */
  isUrlAllowed(uri: string): boolean {
    const parsedUrl = this.parseUrl(uri);
    if (!parsedUrl) {
      return false;
    }

    return this.isHostnameAllowed(parsedUrl.hostname);
  }

  /**
   * Returns `true` when the hostname is allowed.
   *
   * Note: `allowedHosts: ['*']` disables hostname filtering — any hostname passes.
   */
  isHostnameAllowed(hostname: string): boolean {
    if (this.allowedHosts.has('*')) {
      return true;
    }

    return this.allowedHosts.has(hostname);
  }

  /**
   * Throws if the URL is not allowed, with an actionable error message.
   * Protocol errors are surfaced before hostname errors.
   */
  ensureUrlAllowed(uri: string): void {
    if (!uri.startsWith('//')) {
      try {
        const raw = new URL(uri);
        if (!this.allowedProtocols.has(raw.protocol)) {
          throw new Error(
            `URL scheme "${raw.protocol.replace(/:$/, '')}" is not allowed. Permitted schemes: ${[
              ...this.allowedProtocols,
            ]
              .map((p) => p.replace(/:$/, ''))
              .join(', ')}.`
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes('scheme')) {
          throw e;
        }
      }
    }

    const parsedUrl = this.parseUrl(uri);

    if (!parsedUrl) {
      const hasProtocol = /^https?:\/\//i.test(uri);
      const message = hasProtocol
        ? `Invalid URL. Ensure the URL is well-formed.`
        : `Invalid URL. URLs must include a protocol (e.g., https://<host>/<path>).`;
      throw new Error(message);
    }

    if (!this.isHostnameAllowed(parsedUrl.hostname)) {
      throw new Error(
        `Target host is not in the Kibana config workflowsExecutionEngine.http.allowedHosts`
      );
    }
  }
}
