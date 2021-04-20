/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config, FRAME_ANCESTORS_RULE } from './config';

const DEFAULT_CONFIG = Object.freeze(config.schema.validate({}));

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export interface ICspConfig {
  /**
   * The CSP rules used for Kibana.
   */
  readonly rules: string[];

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
   * Whether or not embedding (using iframes) should be allowed by the CSP. If embedding is disabled *and* no custom rules have been
   * defined, a restrictive 'frame-ancestors' rule will be added to the default CSP rules.
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
  static readonly DEFAULT = new CspConfig();

  public readonly rules: string[];
  public readonly strict: boolean;
  public readonly warnLegacyBrowsers: boolean;
  public readonly disableEmbedding: boolean;
  public readonly header: string;

  /**
   * Returns the default CSP configuration when passed with no config
   * @internal
   */
  constructor(rawCspConfig: Partial<Omit<ICspConfig, 'header'>> = {}) {
    const source = { ...DEFAULT_CONFIG, ...rawCspConfig };

    this.rules = [...source.rules];
    this.strict = source.strict;
    this.warnLegacyBrowsers = source.warnLegacyBrowsers;
    this.disableEmbedding = source.disableEmbedding;
    if (!rawCspConfig.rules?.length && source.disableEmbedding) {
      this.rules.push(FRAME_ANCESTORS_RULE);
    }
    this.header = this.rules.join('; ');
  }
}
