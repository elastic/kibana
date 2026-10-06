/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ShareContext,
  ShareConfigs,
  ShareRegistryPublicApi,
  ShareActionIntents,
  ShareRegistryApiStart,
  ShareMenuProviderLegacy,
  RegisterShareIntegrationArgs,
} from '../types';
export declare class ShareRegistry implements ShareRegistryPublicApi {
  private urlService?;
  private anonymousAccessServiceProvider?;
  private capabilities?;
  private getLicense?;
  private readonly globalMarker;
  constructor();
  private readonly shareOptionsStore;
  setup(): {
    /**
     * @deprecated Use {@link registerShareIntegration} instead.
     */
    register: (value: ShareMenuProviderLegacy) => void;
    registerShareIntegration: <I>(
      ...args: [string, RegisterShareIntegrationArgs<I>] | [RegisterShareIntegrationArgs<I>]
    ) => void;
  };
  start({
    urlService,
    anonymousAccessServiceProvider,
    capabilities,
    getLicense,
  }: ShareRegistryApiStart): {
    availableIntegrations: (objectType: string, groupId?: string) => ShareActionIntents[];
    resolveShareItemsForShareContext: ({
      objectType,
      isServerless,
      ...shareContext
    }: ShareContext & {
      isServerless: boolean;
    }) => Promise<ShareConfigs[]>;
  };
  private registerShareIntentAction;
  private registerLinkShareAction;
  private registerEmbedShareAction;
  /**
   * @description provides an escape hatch to support allowing legacy share menu items to be registered
   */
  private register;
  private registerShareIntegration;
  private getShareConfigOptionsForObject;
  /**
   * Returns all share actions that are available for the given object type.
   */
  private availableIntegrations;
  private resolveShareItemsForShareContext;
}
export type ShareMenuRegistryStart = ReturnType<ShareRegistry['start']>;
export type ShareMenuRegistrySetup = ReturnType<ShareRegistry['setup']>;
