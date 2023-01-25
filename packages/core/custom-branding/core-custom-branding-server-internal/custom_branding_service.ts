/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CustomBrandingFetchFn, CustomBrandingStart } from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
/**
 * @internal
 */
export interface InternalCustomBrandingSetup {
  register: (pluginName: string, fetchFn: CustomBrandingFetchFn) => void;
  getBrandingFor: (request: KibanaRequest, unauthenticated?: boolean) => Promise<CustomBranding>;
}

export class CustomBrandingService {
  private pluginName?: string;
  private logger: Logger;
  private fetchFn?: CustomBrandingFetchFn;
  private startCalled: boolean = false;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('custom-branding-service');
  }

  public setup(): InternalCustomBrandingSetup {
    return {
      register: (pluginName, fetchFn) => {
        this.logger.info('CustomBrandingService registering plugin: ' + pluginName);
        if (this.pluginName) {
          throw new Error('Another plugin already registered');
        }
        if (!pluginName || !fetchFn) {
          throw new Error(
            'Both plugin name and fetch function need to be provided when registering a plugin'
          );
        }
        this.pluginName = pluginName;
        this.fetchFn = fetchFn;
      },
      getBrandingFor: this.getBrandingFor,
    };
  }

  public start(): CustomBrandingStart {
    this.startCalled = true;
    return {};
  }

  public stop() {}

  private getBrandingFor = async (
    request: KibanaRequest,
    unauthenticated?: boolean
  ): Promise<CustomBranding> => {
    if (!this.startCalled) {
      throw new Error('Cannot be called before #start');
    }
    if (!this.pluginName || this.pluginName !== 'customBranding' || !this.fetchFn) {
      return {};
    }
    return this.fetchFn!(request, Boolean(unauthenticated));
  };
}
