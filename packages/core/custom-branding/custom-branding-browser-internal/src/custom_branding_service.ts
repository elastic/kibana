/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CustomBranding,
  CustomBrandingStart,
  CustomBrandingSetup,
} from '@kbn/core-custom-branding-browser';

const CUSTOM_BRANDING_PLUGIN = 'customBranding';

export class CustomBrandingService {
  private customBranding: CustomBranding;
  private registeredPlugin?: string;

  constructor() {
    this.customBranding = {};
  }

  private set(customBranding: CustomBranding) {
    if (!this.registeredPlugin || this.registeredPlugin !== CUSTOM_BRANDING_PLUGIN) {
      throw new Error('Plugin needs to register before setting custom branding');
    }
    if (!this.customBranding) {
      this.customBranding = customBranding;
    } else {
      Object.keys(customBranding).forEach((key) => {
        this.customBranding[key as keyof CustomBranding] =
          customBranding[key as keyof CustomBranding];
      });
    }
  }

  private get() {
    return this.customBranding;
  }

  private hasCustomBrandingSet() {
    return Object.keys(this.customBranding).length > 0;
  }

  private register(pluginName: string) {
    if (this.registeredPlugin) {
      throw new Error('Plugin already registered');
    }
    this.registeredPlugin = pluginName;
  }

  /**
   * @public
   */
  public start(): CustomBrandingStart {
    return {
      get: this.get,
      set: this.set,
      hasCustomBrandingSet: this.hasCustomBrandingSet,
    };
  }

  /**
   * @public
   */
  public setup(): CustomBrandingSetup {
    return {
      register: this.register,
    };
  }
}
