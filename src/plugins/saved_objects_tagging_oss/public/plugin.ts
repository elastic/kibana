/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from 'src/core/public';
import { SavedObjectSetup } from '../../saved_objects/public';
import { SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart } from './types';
import { SavedObjectsTaggingApi } from './api';
import { tagDecoratorConfig } from './decorator';

interface SetupDeps {
  savedObjects?: SavedObjectSetup;
}

export class SavedObjectTaggingOssPlugin
  implements
    Plugin<SavedObjectTaggingOssPluginSetup, SavedObjectTaggingOssPluginStart, SetupDeps, {}> {
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
