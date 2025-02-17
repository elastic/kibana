/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService, ShareContext } from '../types';
import {
  ShareOrchestrator,
  type ShareActionIntents,
  type SupportedShareIntegrations,
  type InternalShareActionIntent,
  type LinkShare,
  type EmbedShare,
  type ShareIntegration,
} from './share_orchestrator';

interface ShareOptionsManagerStart {
  core: CoreStart;
  urlService: BrowserUrlService;
  anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
}

export class ShareOptionsManager implements ShareOrchestrator {
  private core?: CoreStart;
  private urlService?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;

  private readonly globalMarker: string = '*';

  constructor() {
    // this.registerLinkShareAction();
    // this.registerEmbedShareAction();
  }

  private readonly restrictedShareActionIntent: readonly InternalShareActionIntent[] = [
    'link',
    'embed',
  ];

  private readonly shareOptionsRegistry: Record<
    string,
    Map<InternalShareActionIntent | `integration-${string}`, ShareActionIntents>
  > = {
    [this.globalMarker]: new Map(),
  };

  start({ core, urlService, anonymousAccessServiceProvider }: ShareOptionsManagerStart) {
    this.core = core;
    this.urlService = urlService;
    this.anonymousAccessServiceProvider = anonymousAccessServiceProvider;
  }

  registerShareIntentAction(shareObject: string, shareActionIntent: ShareActionIntents): void {
    const { shareType, ...actionIntentDefs } = shareActionIntent;

    if (!this.shareOptionsRegistry[shareObject]) {
      this.shareOptionsRegistry[shareObject] = new Map();
    }

    const shareContextMap = this.shareOptionsRegistry[shareObject];

    // only one restricted share action can be registered per sharing app
    if (this.restrictedShareActionIntent.some((intent) => shareContextMap.has(intent))) {
      throw new Error(
        `Share action with type [${shareType}] for app [${shareObject}] has already been registered.`
      );
    }

    shareContextMap.set(
      shareType === 'integration'
        ? `integration-${shareActionIntent.groupId || 'unknown'}-${shareActionIntent.id}`
        : shareType,
      {
        shareType,
        ...actionIntentDefs,
      }
    );
  }

  private registerLinkShareAction(): void {
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'link',
    });
  }

  private registerEmbedShareAction(): void {
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'embed',
    });
  }

  registerShareIntegration<I extends ShareIntegration>(
    ...args: [string, Omit<I, 'shareType'>] | [Omit<I, 'shareType'>]
  ): void {
    const [shareObject, shareActionIntent] =
      args.length === 1 ? [this.globalMarker, args[0]] : args;
    this.registerShareIntentAction(shareObject, {
      shareType: 'integration',
      ...shareActionIntent,
    });
  }

  getShareConfigOptionsForApp(
    objectType: ShareContext['objectType']
  ): Array<ShareActionIntents | undefined> {
    const shareContextMap = this.shareOptionsRegistry[objectType];
    const globalOptions = Array.from(this.shareOptionsRegistry[this.globalMarker].values());

    if (!shareContextMap) {
      return globalOptions;
    }

    return globalOptions.concat(Array.from(shareContextMap.values()));
  }

  resolveShareItemsForShareContext({ objectType, ...shareContext }: ShareContext) {
    return this.getShareConfigOptionsForApp(objectType).map((shareAction) => {
      return {
        ...shareAction,
        config: shareAction?.config?.call(null, { objectType, ...shareContext }, {}),
      };
    });
  }
}
