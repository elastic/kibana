/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export interface ICspConfig {
  /**
   * Specify whether browsers that do not support CSP should be
   * able to use Kibana. Use `true` to block and `false` to allow.
   */
  readonly strict: boolean;

  /**
   * Specify whether users with legacy browsers should be warned
   * about their lack of Kibana security compliance.
   */
  readonly warnLegacyBrowsers: boolean;

  /**
   * Whether or not embedding (using iframes) should be allowed by the CSP. If embedding is disabled, a restrictive 'frame-ancestors' rule will be added to the default CSP rules.
   */
  readonly disableEmbedding: boolean;

  /**
   * The CSP rules in a formatted directives string for use
   * in a `Content-Security-Policy` header.
   */
  readonly header: string;

  /**
   * The CSP rules in a formatted directives string for use
   * in a `Content-Security-Policy-Report-Only` header.
   */
  readonly reportOnlyHeader: string;
}
