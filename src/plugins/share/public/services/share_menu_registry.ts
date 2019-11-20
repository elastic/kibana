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

import { ShareContext, ShareMenuProvider } from '../types';

export class ShareMenuRegistry {
  private readonly shareMenuProviders = new Map<string, ShareMenuProvider>();

  public setup() {
    return {
      /**
       * Register an additional source of items for share context menu items. All registered providers
       * will be called if a consumer displays the context menu. Returned `ShareMenuItem`s will be shown
       * in the context menu together with the default built-in share options.
       * Each share provider needs a globally unique id.
       * @param shareMenuProvider
       */
      register: (shareMenuProvider: ShareMenuProvider) => {
        if (this.shareMenuProviders.has(shareMenuProvider.id)) {
          throw new Error(
            `Share menu provider with id [${shareMenuProvider.id}] has already been registered. Use a unique id.`
          );
        }

        this.shareMenuProviders.set(shareMenuProvider.id, shareMenuProvider);
      },
    };
  }

  public start() {
    return {
      getShareMenuItems: (context: ShareContext) =>
        Array.from(this.shareMenuProviders.values()).flatMap(shareActionProvider =>
          shareActionProvider.getShareMenuItems(context)
        ),
    };
  }
}

export type ShareMenuRegistrySetup = ReturnType<ShareMenuRegistry['setup']>;
export type ShareMenuRegistryStart = ReturnType<ShareMenuRegistry['start']>;
