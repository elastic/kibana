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

import { Plugin } from 'src/core/public';
import { SpacesOssPluginSetup, SpacesOssPluginStart } from './types';
import { SpacesApi } from './api';

export class SpacesOssPlugin implements Plugin<SpacesOssPluginSetup, SpacesOssPluginStart, {}, {}> {
  private apiRegistered = false;
  private api?: SpacesApi;

  constructor() {}

  public setup() {
    return {
      registerSpacesApi: (provider: Promise<SpacesApi>) => {
        if (this.apiRegistered) {
          throw new Error('Spaces API can only be registered once');
        }
        this.apiRegistered = true;

        provider.then(
          (api) => {
            this.api = api;
          },
          (error) => {
            // eslint-disable-next-line no-console
            console.log(
              'Error during Spaces API promise resolution. Spaces API has been disabled',
              error
            );
            this.apiRegistered = false;
          }
        );
      },
    };
  }

  public start() {
    return {
      isSpacesAvailable: () => this.apiRegistered,
      getSpacesApi: () => this.api,
    };
  }
}
