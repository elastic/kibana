/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import { UrlParamExtension, ScreenshotExportOpts } from '../types';

export type ShareTypes = 'link' | 'export' | 'embed' | 'integration';

export type InternalShareActionIntent = Exclude<ShareActionIntent['shareType'], 'integration'>;

/**
 * @description defines base config for all sharing actions, with capability for extension as needed
 */
export interface ShareTypeConfig<C extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * The title of the share action
   */
  title: string;
  CTAButtonConfig?: {
    id: string;
    dataTestSubj: string;
    label: string;
  };
  helpText?: ReactElement;
  requiresSavedState?: boolean;
  warnings?: Array<{ title: string; message: string }>;
  // ctx will be the context of the app that is calling the share action, alongside core share deps
  config: (ctx: Record<string, unknown>) => {
    allowShortUrl?: boolean;
    draftModeCallOut?: ReactNode;
    // computeAnonymousCapabilities?: (anonymousUserCapabilities: Capabilities) => boolean;
  } & C;
}

interface ShareMenuItemV2Base<
  Config extends Record<string, unknown>,
  T extends ShareTypes = ShareTypes
> {
  shareType: T;
  shareTypeMeta: ShareTypeConfig<Config>;
  /**
   * specifies the app this share action is registered for, as of now within kibana valid share context could be
   * lens, dashboard, canvas, this value will be used to retrieved all registered share actions for the given
   */
  sharingApp: string;
}

/**
 * @description type definition for link share action
 */
type LinkShare = ShareMenuItemV2Base<
  {
    /**
     * @description opt-in method to provide a custom method to generate a share url based
     */
    delegatedShareUrlHandler?: () => string;
  },
  'link'
>;

/**
 * @description type definition for export share action
 */
type ExportShare = ShareMenuItemV2Base<
  {
    generateExport: (args: ScreenshotExportOpts) => Promise<unknown>;
    generateExportUrl: (args: ScreenshotExportOpts) => string | undefined;
    supportedLayoutOptions: ['print'];
    renderLayoutOptionSwitch?: boolean;
  },
  'export'
>;

/**
 * @description type definition for embed share action
 */
type EmbedShare = ShareMenuItemV2Base<
  {
    allowEmbed: boolean;
    embedUrlParamExtensions?: UrlParamExtension[];
  },
  'embed'
>;

/**
 * @description type definition for integration share action, expected to be used to extend the share actions available,
 *  supports multiple registrations per share context
 */
type ShareIntegration<C extends Record<string, unknown> = Record<string, unknown>> =
  ShareMenuItemV2Base<C, 'integration'>;

export type ShareActionIntent = LinkShare | ExportShare | EmbedShare | ShareIntegration;

export interface SharingData {
  title: string;
  locatorParams: {
    id: string;
    params: Record<string, unknown>;
  };
}

export abstract class ShareOrchestrator {
  // when registering a share action only one share action can be registered per supported share context, attempting to register another will throw an error
  abstract registerShareAction(args: ShareActionIntent): void;

  // when toggling the share menu we keep it simple, only passing in the minimum required data, instead of a sleuth of options
  // any extra check that is required to be done will happen behind the scenes for each share context
  abstract toggleShare(context: string, data: SharingData): void;

  abstract fetchShareOptionForApp(
    context: string
  ): Array<Omit<ShareActionIntent, 'sharingApp'> | undefined>;
}
