/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CustomBrandingStart,
  CustomBrandingStartDeps,
} from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { KibanaRequest } from '@kbn/core-http-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
/**
 * @internal
 */
export interface InternalCustomBrandingSetup {
  register: (pluginName: string) => void;
  setUiSettingsKeys: (uiSettingsKeys: string[]) => void;
}
export declare class CustomBrandingService {
  private pluginName;
  private savedObjects?;
  private uiSettings?;
  private settingsKeys?;
  private logger;
  constructor(coreContext: CoreContext);
  private getBrandingFrom;
  getBrandingFor: (request: KibanaRequest) => Promise<CustomBranding>;
  setup(): InternalCustomBrandingSetup;
  start({ savedObjects, uiSettings }: CustomBrandingStartDeps): CustomBrandingStart;
  /**
   * @public
   */
  stop(): void;
}
