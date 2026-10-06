/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CustomBrandingStart,
  CustomBrandingSetup,
  CustomBrandingSetupDeps,
} from '@kbn/core-custom-branding-browser';
export declare class CustomBrandingService {
  private customBranding$;
  private stop$;
  /**
   * @public
   */
  setup({ injectedMetadata }: CustomBrandingSetupDeps): CustomBrandingSetup;
  /**
   * @public
   */
  start(): CustomBrandingStart;
  stop(): void;
}
