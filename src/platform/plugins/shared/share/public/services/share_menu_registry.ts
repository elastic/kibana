/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ApplicationStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-plugin/public';
import type {
  BrowserUrlService,
  ShareContext,
  ShareConfigs,
  ShareRegistryPublicApi,
  ShareActionIntents,
  InternalShareActionIntent,
  ShareIntegration,
  ShareRegistryApiStart,
  ShareMenuProviderLegacy,
} from '../types';
import type { AnonymousAccessServiceContract } from '../../common/anonymous_access';

export class ShareRegistry implements ShareRegistryPublicApi {
  private urlService?: BrowserUrlService;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
  private capabilities?: ApplicationStart['capabilities'];
  private getLicense?: () => ILicense | undefined;

  private readonly globalMarker: string = '*';

  constructor() {
    // register default share actions
    this.registerLinkShareAction();
    this.registerEmbedShareAction();
  }

  private readonly shareOptionsStore: Record<
    string,
    Map<InternalShareActionIntent | `integration-${string}` | 'legacy', ShareActionIntents>
  > = {
    [this.globalMarker]: new Map(),
  };

  setup() {
    return {
      /**
       * @deprecated Use {@link registerShareIntegration} instead.
       */
      register: this.register.bind(this),
      registerShareIntegration: this.registerShareIntegration.bind(this),
    };
  }

  start({
    urlService,
    anonymousAccessServiceProvider,
    capabilities,
    getLicense,
  }: ShareRegistryApiStart) {
    this.urlService = urlService;
    this.anonymousAccessServiceProvider = anonymousAccessServiceProvider;
    this.capabilities = capabilities;
    this.getLicense = getLicense;

    return {
      availableIntegrations: this.availableIntegrations.bind(this),
      resolveShareItemsForShareContext: this.resolveShareItemsForShareContext.bind(this),
    };
  }

  private registerShareIntentAction(
    shareObject: string,
    shareActionIntent: ShareActionIntents
  ): void {
    if (!this.shareOptionsStore[shareObject]) {
      this.shareOptionsStore[shareObject] = new Map();
    }

    const shareContextMap = this.shareOptionsStore[shareObject];

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
   * @description provides an escape hatch to support allowing legacy share menu items to be registered
   */
  private register(value: ShareMenuProviderLegacy) {
    // implement backwards compatibility for the share plugin
    this.registerShareIntentAction(this.globalMarker, {
      shareType: 'legacy',
      id: value.id,
      config: value.getShareMenuItemsLegacy,
    });
  }

  private registerShareIntegration<I extends ShareIntegration>(
    ...args: [string, Omit<I, 'shareType'>] | [Omit<I, 'shareType'>]
  ): void {
    const [shareObject, shareActionIntent] =
      args.length === 1 ? [this.globalMarker, args[0]] : args;
    this.registerShareIntentAction(shareObject, {
      shareType: 'integration',
      ...shareActionIntent,
    });
  }

  private getShareConfigOptionsForObject(
    objectType: ShareContext['objectType']
  ): ShareActionIntents[] {
    const shareContextMap = this.shareOptionsStore[objectType];
    const globalOptions = Array.from(this.shareOptionsStore[this.globalMarker].values());

    if (!shareContextMap) {
      return globalOptions;
    }

    return globalOptions.concat(Array.from(shareContextMap.values()));
  }

  /**
   * Returns all share actions that are available for the given object type.
   */
  private availableIntegrations(objectType: string, groupId?: string): ShareActionIntents[] {
    if (!this.capabilities || !this.getLicense) {
      throw new Error('ShareOptionsManager#start was not invoked');
    }

    return this.getShareConfigOptionsForObject(objectType).filter((share) => {
      if (
        groupId &&
        (share.shareType !== 'integration' ||
          (share?.groupId !== groupId && share.shareType === 'integration'))
      ) {
        return false;
      }

      if (share.shareType === 'integration' && share.prerequisiteCheck) {
        return share.prerequisiteCheck({
          capabilities: this.capabilities!,
          license: this.getLicense!(),
          objectType,
        });
      }

      // if no activation requirement is provided, assume that the share action is always available
      return true;
    });
  }

  private resolveShareItemsForShareContext({
    objectType,
    isServerless,
    ...shareContext
  }: ShareContext & { isServerless: boolean }): ShareConfigs[] {
    if (!this.urlService || !this.anonymousAccessServiceProvider) {
      throw new Error('ShareOptionsManager#start was not invoked');
    }

    return this.availableIntegrations(objectType)
      .map((shareAction) => {
        let config: ShareConfigs['config'] | null;

        if (shareAction.shareType === 'legacy') {
          config = shareAction.config.call(null, {
            objectType,
            ...shareContext,
          });
        } else {
          config = shareAction.config.call(null, {
            urlService: this.urlService!,
            anonymousAccessServiceProvider: this.anonymousAccessServiceProvider,
            objectType,
            ...shareContext,
          });
        }

        return {
          ...shareAction,
          config,
        } as ShareConfigs;
      })
      .filter((shareAction) => {
        return isServerless
          ? shareAction.shareType !== 'embed' && shareAction.config
          : shareAction.config;
      });
  }
}

export type ShareMenuRegistryStart = ReturnType<ShareRegistry['start']>;
export type ShareMenuRegistrySetup = ReturnType<ShareRegistry['setup']>;
