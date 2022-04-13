/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config, CspConfigType } from './config';
import { CspDirectives } from './csp_directives';

const DEFAULT_CONFIG = Object.freeze(config.schema.validate({}));

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
}

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export class CspConfig implements ICspConfig {
  static readonly DEFAULT = new CspConfig(DEFAULT_CONFIG);

  readonly #directives: CspDirectives;
  public readonly strict: boolean;
  public readonly warnLegacyBrowsers: boolean;
  public readonly disableEmbedding: boolean;
  public readonly header: string;

  /**
   * Returns the default CSP configuration when passed with no config
   * @internal
   */
  constructor(rawCspConfig: CspConfigType) {
    this.#directives = CspDirectives.fromConfig(rawCspConfig);
    if (rawCspConfig.disableEmbedding) {
      this.#directives.clearDirectiveValues('frame-ancestors');
      this.#directives.addDirectiveValue('frame-ancestors', `'self'`);
    }
    this.header = this.#directives.getCspHeader();
    this.strict = rawCspConfig.strict;
    this.warnLegacyBrowsers = rawCspConfig.warnLegacyBrowsers;
    this.disableEmbedding = rawCspConfig.disableEmbedding;
  }
}
