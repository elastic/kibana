/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  SavedObjectTaggingOssPluginSetup,
  SavedObjectTaggingOssPluginStart,
  SavedObjectsTaggingApiServer,
} from './types';

export class SavedObjectTaggingOssPlugin
  implements Plugin<SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart>
{
  private readonly logger: Logger;
  private apiRegistered = false;
  private api?: SavedObjectsTaggingApiServer;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup({}: CoreSetup): SavedObjectTaggingOssPluginSetup {
    this.logger.debug('saved_object_tagging_oss: Setup');
    return {
      registerTaggingApi: (provider: Promise<SavedObjectsTaggingApiServer>) => {
        if (this.apiRegistered) {
          throw new Error('tagging API can only be registered once');
        }
        this.apiRegistered = true;

        provider.then(
          (api) => {
            this.api = api;
          },
          (error) => {
            this.logger.error(
              'Error during tagging API promise resolution. SO tagging has been disabled',
              error
            );
            this.apiRegistered = false;
          }
        );
      },
    };
  }

  public start({}: CoreStart): SavedObjectTaggingOssPluginStart {
    this.logger.debug('saved_object_tagging_oss: Started');
    return {
      isTaggingAvailable: () => this.apiRegistered,
      getTaggingApi: () => this.api,
    };
  }
}
