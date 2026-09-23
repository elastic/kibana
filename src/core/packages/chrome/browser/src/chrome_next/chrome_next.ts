/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ChromeAppHeaderConfig } from '../app_header';
import type { ChromeControls } from '../controls';
import type { ChromeHelp, ChromeNewsfeedHandler } from '../help';

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
