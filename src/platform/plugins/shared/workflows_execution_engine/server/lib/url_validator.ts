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
   * Checks if a URL is allowed based on the allowedHosts configuration
   */
  isUrlAllowed(uri: string): boolean {
    try {
      // Reject protocol-relative URLs as they are ambiguous in server context
      if (uri.startsWith('//')) {
        return false;
      }

      const parsedUrl = new URL(uri);
      const hostname = parsedUrl.hostname;

      if (!hostname) {
        return false;
      }

      return this.isHostnameAllowed(hostname);
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a hostname is allowed
   */
  isHostnameAllowed(hostname: string): boolean {
    // Check for wildcard '*' which allows any host
    if (this.allowedHosts.has('*')) {
      return true;
    }

    // Check if the specific hostname is allowed
    return this.allowedHosts.has(hostname);
  }

  /**
   * Validates a URL and throws an error if not allowed
   */
  ensureUrlAllowed(uri: string): void {
    if (!this.isUrlAllowed(uri)) {
      throw new Error(
        `target url "${uri}" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts`
      );
    }
  }
}
