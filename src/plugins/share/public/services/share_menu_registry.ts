/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
        Array.from(this.shareMenuProviders.values()).flatMap((shareActionProvider) =>
          shareActionProvider.getShareMenuItems(context)
        ),
    };
  }
}

export type ShareMenuRegistrySetup = ReturnType<ShareMenuRegistry['setup']>;
export type ShareMenuRegistryStart = ReturnType<ShareMenuRegistry['start']>;
