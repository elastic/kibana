/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { UrlParamExtension, ScreenshotExportOpts, ShareContext } from '../types';

export type ShareTypes = 'link' | 'embed' | 'integration';

export type InternalShareActionIntent = Exclude<ShareTypes, 'integration'>;

interface ShareActionUserInputBase<E extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * The title of the share action
   */
  title: string;
  allowShortUrl?: boolean;
  draftModeCallOut?: ReactNode;
  helpText?: ReactElement;
  CTAButtonConfig?: {
    id: string;
    dataTestSubj: string;
    label: string;
  };
}

type ShareImplementation<
  T extends ShareTypes,
  U extends Record<string, unknown> = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>
> = T extends 'integration'
  ? {
      id: string;
      groupId?: string;
      shareType: T;
      config: (ctx: ShareContext, userInput: ShareActionUserInputBase<U>) => C;
    }
  : {
      shareType: T;
      config: (ctx: ShareContext, userInput: ShareActionUserInputBase<U>) => C;
    };

export type LinkShare = ShareImplementation<'link', { delegatedShareUrlHandler?: () => string }>;

export type EmbedShare = ShareImplementation<
  'embed',
  { allowEmbed: boolean; embedUrlParamExtensions?: UrlParamExtension[] }
>;

export type ShareIntegration<
  IntegrationParameters extends Record<string, unknown> = Record<string, unknown>
> = ShareImplementation<'integration', {}, IntegrationParameters>;

export type ShareActionIntents = LinkShare | EmbedShare | ShareIntegration;

/**
 * @description bundled share integration for performing exports
 */
export interface ExportShare
  extends ShareIntegration<{
    /**
     * @deprecated only kept around for legacy reasons
     */
    name?: string;
    /**
     * @deprecated only kept around for legacy reasons
     */
    icon?: EuiIconProps['type'];
    /**
     * @deprecated only kept around for legacy reasons
     */
    sortOrder?: number;
    label: string;
    exportType: string;
    generateAssetExport: (args: ScreenshotExportOpts) => Promise<unknown>;
    generateValueExport: (args: ScreenshotExportOpts) => string | undefined;
    warnings?: Array<{ title: string; message: string }>;
    requiresSavedState?: boolean;
    supportedLayoutOptions: ['print'];
    renderLayoutOptionSwitch?: boolean;
  }> {
  groupId: 'export';
}

export interface SharingData {
  title: string;
  locatorParams: {
    id: string;
    params: Record<string, unknown>;
  };
}

export abstract class ShareOrchestrator {
  abstract registerShareIntegration<I extends ShareIntegration>(shareObject: string, arg: I): void;
  abstract registerShareIntegration<I extends ShareIntegration>(arg: I): void;

  // abstract registerShareAction(app: string, args: ShareActionIntent[]): void;
  // abstract registerShareAction(args: ShareActionIntent[]): void;

  // // when toggling the share menu we keep it simple, only passing in the minimum required data, instead of a sleuth of options
  // // any extra check that is required to be done will happen behind the scenes for each share context
  // abstract toggleShare(context: string, data: SharingData): void;

  // abstract fetchShareOptionForApp(sharingApp: string): Array<ShareActionIntent | undefined>;
}
