/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ICspConfig } from '@kbn/core-http-server';
import { CspAdditionalConfig, cspConfig, CspConfigType } from './config';
import { CspDirectives } from './csp_directives';

const DEFAULT_CONFIG = Object.freeze(cspConfig.schema.validate({}));

/**
 * CSP configuration for use in Kibana.
 * @public
 */
export class CspConfig implements ICspConfig {
  static readonly DEFAULT = new CspConfig(DEFAULT_CONFIG);

  readonly #directives: CspDirectives;
  public readonly strict: boolean;
  public readonly disableUnsafeEval: boolean;
  public readonly warnLegacyBrowsers: boolean;
  public readonly disableEmbedding: boolean;
  public readonly header: string;

  /**
   * Returns the default CSP configuration when passed with no config
   * @internal
   */
  constructor(rawCspConfig: CspConfigType, ...moreConfigs: CspAdditionalConfig[]) {
    this.#directives = CspDirectives.fromConfig(rawCspConfig, ...moreConfigs);
    if (rawCspConfig.disableEmbedding) {
      this.#directives.clearDirectiveValues('frame-ancestors');
      this.#directives.addDirectiveValue('frame-ancestors', `'self'`);
    }
    this.header = this.#directives.getCspHeader();
    this.strict = rawCspConfig.strict;
    this.disableUnsafeEval = rawCspConfig.disableUnsafeEval;
    this.warnLegacyBrowsers = rawCspConfig.warnLegacyBrowsers;
    this.disableEmbedding = rawCspConfig.disableEmbedding;
  }
}
