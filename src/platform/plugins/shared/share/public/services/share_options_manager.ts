/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ShareOrchestrator,
  type ShareActionIntents,
  type InternalShareActionIntent,
  type ShareIntegration,
  type ShareOptionsManagerStart,
} from './share_orchestrator';
import type { BrowserUrlService, ShareContext } from '../types';
import type { AnonymousAccessServiceContract } from '../../common/anonymous_access';

export class ShareOptionsManager implements ShareOrchestrator {
  private urlService?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;

  private readonly globalMarker: string = '*';

  private readonly restrictedShareActionIntent: readonly InternalShareActionIntent[] = [
    'link',
    'embed',
  ];

  constructor() {
    // register default share actions
    this.registerLinkShareAction();
    this.registerEmbedShareAction();
  }

  private readonly shareOptionsRegistry: Record<
    string,
    Map<InternalShareActionIntent | `integration-${string}`, ShareActionIntents>
  > = {
    [this.globalMarker]: new Map(),
  };

  private registerShareIntentAction(
    shareObject: string,
    shareActionIntent: ShareActionIntents
  ): void {
    if (!this.shareOptionsRegistry[shareObject]) {
      this.shareOptionsRegistry[shareObject] = new Map();
    }

    const shareContextMap = this.shareOptionsRegistry[shareObject];

    const recordKey =
      shareActionIntent.shareType === 'integration'
        ? (`integration-${shareActionIntent.groupId || 'unknown'}-${shareActionIntent.id}` as const)
        : shareActionIntent.shareType;

    if (shareContextMap.has(recordKey)) {
      throw new Error(
        `Share action with type [${shareActionIntent.shareType}] for app [${shareObject}] has already been registered.`
      );
    }

    shareContextMap.set(recordKey, shareActionIntent);
  }

  private registerLinkShareAction(): void {
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'link',
      config: ({ urlService }) => ({
        shortUrlService: urlService?.shortUrls.get(null)!,
      }),
    });
  }

  private registerEmbedShareAction(): void {
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'embed',
      config: ({ urlService }) => ({
        shortUrlService: urlService?.shortUrls.get(null)!,
      }),
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

  start({ urlService, anonymousAccessServiceProvider }: ShareOptionsManagerStart) {
    this.urlService = urlService;
    this.anonymousAccessServiceProvider = anonymousAccessServiceProvider;
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
    if (!this.urlService || !this.anonymousAccessServiceProvider) {
      throw new Error('ShareOptionsManager#start was not been invoked');
    }

    return this.getShareConfigOptionsForApp(objectType)
      .map((shareAction) => ({
        ...shareAction,
        config: shareAction?.config?.call(
          null,
          {
            objectType,
            urlService: this.urlService!,
            anonymousAccessServiceProvider: this.anonymousAccessServiceProvider,
            ...shareContext,
          },
          {}
        ),
      }))
      .filter((shareAction) => shareAction.config);
  }
}
