/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CspAdditionalConfig } from '../csp';
export interface Input {
  url?: null | string;
}
export declare class CdnConfig {
  private readonly url;
  constructor(url?: null | string);
  get host(): undefined | string;
  get baseHref(): undefined | string;
  getCspConfig(): CspAdditionalConfig;
  static from(input?: Input): CdnConfig;
}
