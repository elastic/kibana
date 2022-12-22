/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CustomBrandingStart,
  CustomBrandingSetup,
  CustomBrandingStartDeps,
} from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { KibanaRequest } from '@kbn/core-http-server';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';

export class CustomBrandingService {
  private pluginRegistered: boolean = false;
  private savedObjects?: InternalSavedObjectsServiceStart;
  private uiSettings?: InternalUiSettingsServiceStart;
  private logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('custom-branding-service');
  }

  private getBrandingFrom = async (uiSettingsClient: IUiSettingsClient) => {
    const keys = ['logo', 'customizedLogo', 'pageTitle', 'faviconPNG', 'faviconSVG'];
    const branding: CustomBranding = {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const fullKey = `customBranding:${key}`;
      // @ts-expect-error
      branding[key] = await uiSettingsClient.get(fullKey);
    }
    return branding;
  };

  public getBrandingFor = async (request: KibanaRequest): Promise<CustomBranding> => {
    this.logger.info('getBrandingFor');
    if (!this.pluginRegistered) {
      return {};
    }
    const soClient = this.savedObjects!.getScopedClient(request);
    const uiSettings = this.uiSettings!.globalAsScopedToClient(soClient);
    const branding = await this.getBrandingFrom(uiSettings);
    return branding;
  };

  /**
   * @public
   */
  public setup(): CustomBrandingSetup {
    this.logger.info('CustomBrandingService setup');
    return {
      register: () => {
        if (this.pluginRegistered) {
          throw new Error('Another plugin already registered');
        }
        this.pluginRegistered = true;
      },
    };
  }

  /**
   * @public
   */
  public start({ savedObjects, uiSettings }: CustomBrandingStartDeps): CustomBrandingStart {
    this.savedObjects = savedObjects;
    this.uiSettings = uiSettings;
    return {};
  }

  /**
   * @public
   */
  public stop() {}
}
