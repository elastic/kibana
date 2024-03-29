/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from '@kbn/core/public';
import { SavedObjectSetup } from '@kbn/saved-objects-plugin/public';
import { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';
import { SavedObjectsTaggingApi } from './api';
import { tagDecoratorConfig } from './decorator';

interface SetupDeps {
  savedObjects?: SavedObjectSetup;
}

export class SavedObjectTaggingOssPlugin
  implements
    Plugin<SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart, SetupDeps, {}>
{
  private apiRegistered = false;
  private api?: SavedObjectsTaggingApi;

  constructor(context: PluginInitializerContext) {}

  public setup({}: CoreSetup, { savedObjects }: SetupDeps) {
    if (savedObjects) {
      savedObjects.registerDecorator(tagDecoratorConfig);
    }

    return {
      registerTaggingApi: (provider: Promise<SavedObjectsTaggingApi>) => {
        if (this.apiRegistered) {
          throw new Error('tagging API can only be registered once');
        }
        this.apiRegistered = true;

        provider.then(
          (api) => {
            this.api = api;
          },
          (error) => {
            // eslint-disable-next-line no-console
            console.log(
              'Error during tagging API promise resolution. SO tagging has been disabled',
              error
            );
            this.apiRegistered = false;
          }
        );
      },
    };
  }

  public start({}: CoreStart) {
    return {
      isTaggingAvailable: () => this.apiRegistered,
      getTaggingApi: () => this.api,
    };
  }
}
