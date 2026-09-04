/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { ChromeExtensionContent } from '@kbn/core-mount-utils-browser';

/**
 * A single AI button registration.
 *
 * `content` is rendered as-is, so the registering owner fully controls the button UI
 * and its visibility. This is intentionally minimal for the transition period: see
 * {@link ChromeControls.aiButton} for why multiple registrations are allowed today.
 *
 * Tech debt: https://github.com/elastic/kibana/issues/272279
 *
 * @public
 */
export interface GlobalHeaderAiButton {
  content: ChromeExtensionContent;
}

/**
 * Configuration for the global search control.
 * @public
 */
export interface GlobalSearchConfig {
  /** Called when the search control is activated. */
  onClick: () => void;
}

/**
 * Persistent interactive chrome controls. Chrome decides where they render.
 *
 * @public
 */
export interface ChromeControls {
  aiButton: {
    /**
     * Register an AI button. Returns an unregister callback.
     * Global — persists across app changes.
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
     * Set the global search configuration.
     * Chrome renders a search control; activating it fires `onClick`.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: GlobalSearchConfig): void;
  };
  /** Context switcher content. */
  contextSwitcher: {
    /**
     * Set the context switcher content.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  /** Project picker content. */
  projectPicker: {
    /**
     * Set the project picker content.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
  userMenu: {
    /**
     * Set the user menu content.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(content?: ReactNode): void;
  };
}
