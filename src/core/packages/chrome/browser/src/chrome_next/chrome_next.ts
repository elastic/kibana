/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DistributiveOmit } from '@elastic/eui';
import type { Observable } from 'rxjs';
import type { AppHeaderBack, AppHeaderConfig } from '@kbn/ui-app-header';
import type { ChromeControls } from '../controls';
import type { ChromeHelp, ChromeNewsfeedHandler } from '../help';

/**
 * Presentation types owned by `@kbn/ui-app-header`. Re-exported so
 * `chrome.next.appHeader.set` and existing `@kbn/core-chrome-browser` imports stay valid.
 *
 * @public
 */
export type {
  AppHeaderBack,
  AppHeaderBadge,
  AppHeaderBadgeItem,
  AppHeaderConfig,
  AppHeaderDescription,
  AppHeaderEditableTitle,
  AppHeaderFavoriteAction,
  AppHeaderFavoriteStatus,
  AppHeaderShareAction,
  AppHeaderMetadataButtonItem,
  AppHeaderMetadataHealthItem,
  AppHeaderMetadataItem,
  AppHeaderMetadataItems,
  AppHeaderMetadataTextItem,
  AppHeaderSpacing,
  AppHeaderTab,
  AppHeaderTabAction,
  AppHeaderTabActions,
  AppHeaderTabBadge,
  AppHeaderTabIconBadge,
  AppHeaderTitle,
  AppHeaderTitleSaveResult,
} from '@kbn/ui-app-header';

/**
 * Chrome-owned registration config. Unlike {@link AppHeaderConfig}, `back` may be `false` to
 * suppress the breadcrumb-derived fallback.
 *
 * @public
 */
export type ChromeAppHeaderConfig = DistributiveOmit<AppHeaderConfig, 'back'> & {
  back?: AppHeaderBack | false;
};

/**
 * Deprecated compatibility facade for the former Chrome Next rollout namespace.
 *
 * @deprecated Use {@link ChromeControls} via `chrome.controls` and {@link ChromeHelp} via
 * `chrome.help`. App-header registration should use `AppHeader`,
 * `ChromeAppHeaderRegistration`, or `useChromeAppHeaderRegistration` from `@kbn/app-header`.
 * @public
 */
export interface ChromeNext {
  /**
   * @deprecated Use `chrome.controls.aiButton`.
   */
  aiButton: ChromeControls['aiButton'];
  /**
   * @deprecated Use `chrome.controls.globalSearch`.
   */
  globalSearch: ChromeControls['globalSearch'];
  /**
   * @deprecated Use `chrome.controls.contextSwitcher`.
   */
  contextSwitcher: ChromeControls['contextSwitcher'];
  /**
   * @deprecated Use `chrome.controls.projectPicker`.
   */
  projectPicker: ChromeControls['projectPicker'];
  /**
   * @deprecated Use `AppHeader` from `@kbn/app-header`, `ChromeAppHeaderRegistration`, or
   * `useChromeAppHeaderRegistration`.
   */
  appHeader: {
    /**
     * Set the app header configuration.
     * Chrome renders an application top bar with back navigation, title, tabs,
     * badges, menu, share action, and favorite action based on this config.
     * Pass the config to show; the returned callback removes it.
     * Per-app, cleared on app change.
     *
     * @deprecated Use `AppHeader` from `@kbn/app-header`, `ChromeAppHeaderRegistration`, or
     * `useChromeAppHeaderRegistration`.
     */
    set(config: ChromeAppHeaderConfig): () => void;
  };
  /**
   * @deprecated Use `chrome.controls.userMenu`.
   */
  userMenu: ChromeControls['userMenu'];
  /**
   * @deprecated Use `chrome.help.registerFeedbackHandler`.
   */
  registerFeedbackHandler: ChromeHelp['registerFeedbackHandler'];
  /**
   * Get the currently registered feedback handler.
   *
   * @deprecated This getter is renderer plumbing and will be removed. Register with
   * `chrome.help.registerFeedbackHandler`.
   */
  getFeedbackHandler$(): Observable<(() => void) | undefined>;
  /**
   * @deprecated Use `chrome.help.registerNewsfeedHandler`.
   */
  registerNewsfeedHandler: ChromeHelp['registerNewsfeedHandler'];
  /**
   * Get the currently registered newsfeed handler.
   *
   * @deprecated This getter is renderer plumbing and will be removed. Register with
   * `chrome.help.registerNewsfeedHandler`.
   */
  getNewsfeedHandler$(): Observable<ChromeNewsfeedHandler | undefined>;
}
