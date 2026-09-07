/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DistributiveOmit } from '@elastic/eui';
import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { AppHeaderBack, AppHeaderConfig } from '@kbn/ui-app-header';
import type { GlobalHeaderAiButton } from './ai_button';
import type { GlobalSearchConfig } from './global_search';

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
 * Chrome Next project-shell APIs.
 *
 * @remarks
 * Chrome Next is the project chrome shell (global header, project navigation, app header
 * surfaces). APIs under this namespace integrate apps and plugins with that shell.
 *
 * @public
 */
export interface ChromeNext {
  aiButton: {
    /**
     * Register an AI button rendered in a fixed slot in the Chrome-Next global header.
     * Returns an unregister callback. Global — persists across app changes.
     *
     * @remarks
     * Stop-gap for the Chrome-Next transition. The end goal is a single, chrome-owned
     * AI button with one registration point. We are not there yet: the legacy header
     * lets every solution register its own button and self-manage visibility, so apps
     * can have more than one in flight at a time. To migrate those apps without
     * regressing behavior, `register` mirrors that model — it accepts multiple
     * registrations and renders each registered button as-is (each owner remains
     * responsible for its own visibility). Once the single-button model lands, this
     * should collapse to one registration and the multi-button handling can be removed.
     *
     * Tech debt: https://github.com/elastic/kibana/issues/272279
     */
    register(button: GlobalHeaderAiButton): () => void;
  };
  /** Global search configuration. */
  globalSearch: {
    /**
     * Set the global search configuration for the Chrome-Next header.
     * Chrome renders a search button; clicking it fires `onClick`.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: GlobalSearchConfig): void;
  };
  /** Context switcher content. */
  contextSwitcher: {
    /**
     * Set the context switcher content for the Chrome-Next header.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  /** Project picker content. */
  projectPicker: {
    /**
     * Set the project picker content for the Chrome-Next header.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  appHeader: {
    /**
     * Set the app header configuration for the Chrome Next project header.
     * Chrome renders an application top bar with back navigation, title, tabs,
     * badges, menu, share action, and favorite action based on this config.
     * Pass the config to show; the returned callback removes it.
     * Per-app, cleared on app change.
     */
    set(config: ChromeAppHeaderConfig): () => void;
  };
  userMenu: {
    /**
     * Set the user menu content for the Chrome-Next global header.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  /**
   * Register a handler that opens the feedback UI in the Chrome Next help menu.
   *
   * @returns A function to unregister the handler.
   */
  registerFeedbackHandler(handler: () => void): () => void;
  /** Get the currently registered Chrome Next feedback handler. */
  getFeedbackHandler$(): Observable<(() => void) | undefined>;
  /**
   * Register a handler that opens the newsfeed UI in the Chrome Next help menu.
   *
   * @returns A function to unregister the handler.
   */
  registerNewsfeedHandler(handler: { open: () => void; hasNew$: Observable<boolean> }): () => void;
  /** Get the currently registered Chrome Next newsfeed handler. */
  getNewsfeedHandler$(): Observable<{ open: () => void; hasNew$: Observable<boolean> } | undefined>;
}
