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
import type { BrowserUrlService } from '../types';
import {
  ShareOrchestrator,
  type ShareActionIntent,
  type SharingData,
  type InternalShareActionIntent,
} from './share_orchestrator';

interface ShareOptionsManagerStart {
  core: CoreStart;
  urlService: BrowserUrlService;
  disableEmbed: boolean;
  anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
}

export class ShareOptionsManager implements ShareOrchestrator {
  private core?: CoreStart;
  private urlService?: BrowserUrlService;
  private disableEmbed?: boolean;
  private anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;

  private readonly restrictedShareActionIntent: readonly InternalShareActionIntent[] = [
    'link',
    'embed',
    'export',
  ];

  private readonly shareOptionsRegistry: Record<
    ShareActionIntent['sharingApp'],
    Map<InternalShareActionIntent | `integration-${string}`, Omit<ShareActionIntent, 'sharingApp'>>
  > = {};

  start({
    core,
    urlService,
    disableEmbed,
    anonymousAccessServiceProvider,
  }: ShareOptionsManagerStart) {
    this.core = core;
    this.urlService = urlService;
    this.disableEmbed = disableEmbed;
    this.anonymousAccessServiceProvider = anonymousAccessServiceProvider;
  }

  registerShareAction(shareActionIntent: ShareActionIntent): void {
    const { sharingApp, shareType, ...actionIntentDefs } = shareActionIntent;

    if (!this.shareOptionsRegistry[sharingApp]) {
      this.shareOptionsRegistry[sharingApp] = new Map();
    }

    const shareContextMap = this.shareOptionsRegistry[sharingApp];

    // only one restricted share action can be registered per sharing app
    if (this.restrictedShareActionIntent.some((intent) => shareContextMap.has(intent))) {
      throw new Error(
        `Share action with type [${shareType}] for app [${sharingApp}] has already been registered.`
      );
    }

    shareContextMap.set(
      shareType === 'integration' ? `integration-${String(crypto.randomUUID())}` : shareType,
      {
        shareType,
        ...actionIntentDefs,
      }
    );
  }

  fetchShareOptionForApp(
    context: string
  ): Array<Omit<ShareActionIntent, 'sharingApp'> | undefined> {
    const shareContextMap = this.shareOptionsRegistry[context];

    if (!shareContextMap) {
      return [];
    }

    return Array.from(shareContextMap.values());
  }

  toggleShare(shareApp: string, data: SharingData): void {
    const shareOptions = this.fetchShareOptionForApp(shareApp);

    // TODO: use client share context to provide values here

    if (!shareOptions.length) {
      return;
    }
  }
}
