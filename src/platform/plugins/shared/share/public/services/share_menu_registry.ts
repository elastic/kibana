/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BrowserUrlService,
  ShareContext,
  ShareConfigs,
  ShareRegistryApi,
  ShareActionIntents,
  InternalShareActionIntent,
  ShareIntegration,
  ShareRegistryApiStart,
  ShareMenuProviderLegacy,
} from '../types';
import type { AnonymousAccessServiceContract } from '../../common/anonymous_access';

export class ShareRegistry implements ShareRegistryApi {
  private urlService?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;

  private readonly globalMarker: string = '*';

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
      config: ({ urlService, anonymousAccessServiceProvider }) => ({
        anonymousAccess: anonymousAccessServiceProvider!(),
        shortUrlService: urlService.shortUrls.get(null),
      }),
    });
  }

  /**
   * @deprecated use {@link registerShareIntegration} instead
   */
  register(value: ShareMenuProviderLegacy) {
    // implement backwards compatibility for the share plugin
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'integration',
      config: value.getShareMenuItemsLegacy,
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

  start({ urlService, anonymousAccessServiceProvider }: ShareRegistryApiStart) {
    this.urlService = urlService;
    this.anonymousAccessServiceProvider = anonymousAccessServiceProvider;
    return this;
  }

  getShareConfigOptionsForObject(
    objectType: ShareContext['objectType']
  ): Array<ShareActionIntents | undefined> {
    const shareContextMap = this.shareOptionsRegistry[objectType];
    const globalOptions = Array.from(this.shareOptionsRegistry[this.globalMarker].values());

    if (!shareContextMap) {
      return globalOptions;
    }

    return globalOptions.concat(Array.from(shareContextMap.values()));
  }

  resolveShareItemsForShareContext({
    objectType,
    isServerless,
    ...shareContext
  }: ShareContext & { isServerless: boolean }): ShareConfigs[] {
    if (!this.urlService || !this.anonymousAccessServiceProvider) {
      throw new Error('ShareOptionsManager#start was not invoked');
    }

    return this.getShareConfigOptionsForObject(objectType)
      .map((shareAction) => ({
        ...shareAction,
        config: shareAction?.config?.call(null, {
          urlService: this.urlService!,
          anonymousAccessServiceProvider: this.anonymousAccessServiceProvider,
          objectType,
          ...shareContext,
        }),
      }))
      .filter(
        (shareAction) => shareAction.config || (shareAction.shareType === 'embed' && !isServerless)
      );
  }
}
