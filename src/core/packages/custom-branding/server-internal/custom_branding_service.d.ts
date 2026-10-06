/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomBrandingFetchFn, CustomBrandingStart } from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
/**
 * @internal
 */
export interface InternalCustomBrandingSetup {
  register: (pluginName: string, fetchFn: CustomBrandingFetchFn) => void;
  getBrandingFor: (
    request: KibanaRequest,
    options?: {
      unauthenticated?: boolean;
    }
  ) => Promise<CustomBranding>;
}
export declare class CustomBrandingService {
  private pluginName?;
  private logger;
  private fetchFn?;
  private startCalled;
  constructor(coreContext: CoreContext);
  setup(): InternalCustomBrandingSetup;
  start(): CustomBrandingStart;
  stop(): void;
  private getBrandingFor;
}
