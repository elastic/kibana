/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// eslint-disable-next-line max-classes-per-file
import type {
  CustomBrandingStart,
  CustomBrandingStartDeps,
} from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { KibanaRequest } from '@kbn/core-http-server';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';

/**
 * @internal
 */
export interface InternalCustomBrandingSetup {
  register: (pluginName: string) => void;
}

class CustomBrandingClass implements CustomBranding {}

export class CustomBrandingService {
  private pluginName: string | undefined;
  private savedObjects?: InternalSavedObjectsServiceStart;
  private uiSettings?: InternalUiSettingsServiceStart;
  private settingsKeys?: string[];
  private logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('custom-branding-service');
    this.settingsKeys = Object.keys(new CustomBrandingClass());
  }

  private getBrandingFrom = async (uiSettingsClient: IUiSettingsClient) => {
    const branding: CustomBranding = {};
    for (let i = 0; i < this.settingsKeys!.length; i++) {
      const key = this.settingsKeys![i] as keyof CustomBranding;
      const fullKey = `customBranding:${key}`;
      const value = await uiSettingsClient.get(fullKey);
      if (value) {
        branding[key] = value;
      }
    }
    return branding;
  };

  public getBrandingFor = async (request: KibanaRequest): Promise<CustomBranding> => {
    if (!this.pluginName || this.pluginName !== 'customBranding' || !this.settingsKeys) {
      return {};
    }
    const soClient = this.savedObjects!.getScopedClient(request);
    const uiSettings = this.uiSettings!.globalAsScopedToClient(soClient);
    return await this.getBrandingFrom(uiSettings);
  };

  public setup(): InternalCustomBrandingSetup {
    return {
      register: (pluginName) => {
        this.logger.info('CustomBrandingService registering plugin: ' + pluginName);
        if (this.pluginName) {
          throw new Error('Another plugin already registered');
        }
        this.pluginName = pluginName;
      },
    };
  }

  public start({ savedObjects, uiSettings }: CustomBrandingStartDeps): CustomBrandingStart {
    this.savedObjects = savedObjects;
    this.uiSettings = uiSettings;
    return {};
  }

  public stop() {}
}
