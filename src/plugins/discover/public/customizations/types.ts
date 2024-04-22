/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AppDeepLink } from '@kbn/core/public';
import type { DiscoverStateContainer } from '../application/main/services/discover_state';
import type { DiscoverCustomizationService } from './customization_service';

export type DiscoverProfileId = string;

export interface DiscoverProfile {
  id: DiscoverProfileId;
  customizationCallbacks: CustomizationCallback[];
  deepLinks?: AppDeepLink[];
}

export interface CustomizationCallbackContext {
  customizations: DiscoverCustomizationService;
  stateContainer: DiscoverStateContainer;
}

export interface DiscoverProfileOptions {
  customize: CustomizationCallback;
  deepLinks?: AppDeepLink[];
}

export type RegisterCustomizationProfile = (
  id: DiscoverProfileId,
  options: DiscoverProfileOptions
) => void;

export type CustomizationCallback = (
  options: CustomizationCallbackContext
) => void | (() => void) | Promise<void | (() => void)>;

export type DiscoverDisplayMode = 'embedded' | 'standalone';

export interface DiscoverCustomizationContext {
  /*
   * Display mode in which discover is running
   */
  displayMode: DiscoverDisplayMode;
  /**
   * Inline top nav configuration
   */
  inlineTopNav: {
    /**
     * Whether or not to show the inline top nav
     */
    enabled: boolean;
    /**
     * Whether or not to show the Logs Explorer tabs
     */
    showLogsExplorerTabs: boolean;
  };
}
