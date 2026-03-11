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
}

/**
 * Validates if a URL is allowed based on the allowedHosts configuration.
 * This implements the same logic as the actions plugin but without depending on it.
 */
export class UrlValidator {
  private allowedHosts: Set<string>;

  constructor(config: UrlValidatorConfig) {
    this.allowedHosts = new Set(config.allowedHosts);
  }

  /**
   * Parses and validates a URL string into a URL object.
   * Returns null if the URL cannot be parsed.
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

      return parsedUrl;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if a URL is allowed based on the allowedHosts configuration
   */
  isUrlAllowed(uri: string): boolean {
    const parsedUrl = this.parseUrl(uri);
    if (!parsedUrl) {
      return false;
    }

    return this.isHostnameAllowed(parsedUrl.hostname);
  }

  /**
   * Checks if a hostname is allowed
   */
  isHostnameAllowed(hostname: string): boolean {
    if (this.allowedHosts.has('*')) {
      return true;
    }

    return this.allowedHosts.has(hostname);
  }

  /**
   * Validates a URL and throws an error if not allowed.
   * Provides specific error messages for unparseable URLs vs disallowed hosts.
   */
  ensureUrlAllowed(uri: string): void {
    const parsedUrl = this.parseUrl(uri);

    if (!parsedUrl) {
      const hasProtocol = /^https?:\/\//i.test(uri);
      const message = hasProtocol
        ? `Invalid URL "${uri}". Ensure the URL is well-formed.`
        : `Invalid URL "${uri}". URLs must include a protocol (e.g., https://${uri}).`;
      throw new Error(message);
    }

    if (!this.isHostnameAllowed(parsedUrl.hostname)) {
      throw new Error(
        `target url "${uri}" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts`
      );
    }
  }
}
