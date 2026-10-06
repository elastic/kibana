/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICspConfig } from '@kbn/core-http-server';
import type { CspAdditionalConfig, CspConfigType } from './config';
/**
 * CSP configuration for use in Kibana.
 * @public
 */
export declare class CspConfig implements ICspConfig {
  #private;
  static readonly DEFAULT: CspConfig;
  readonly strict: boolean;
  readonly disableUnsafeEval: boolean;
  readonly warnLegacyBrowsers: boolean;
  readonly disableEmbedding: boolean;
  readonly header: string;
  readonly reportOnlyHeader: string;
  /**
   * Returns the default CSP configuration when passed with no config
   * @internal
   */
  constructor(rawCspConfig: CspConfigType, ...moreConfigs: CspAdditionalConfig[]);
}
