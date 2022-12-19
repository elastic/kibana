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
  // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
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
    this.customBranding = customBranding;
  }

  private get() {
    if (!this.registeredPlugin || this.registeredPlugin !== CUSTOM_BRANDING_PLUGIN) {
      throw new Error('Plugin needs to register before retrieveing custom branding.');
    }
    return this.customBranding;
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
