/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeNextAiButton } from './ai_button';
import type { ChromeNextGlobalSearchConfig } from './global_search';
import type { ChromeNextHeaderConfig } from './header';
import type { ChromeNextSpaceSelectorConfig } from './space_selector';
import type { ChromeNextUserMenuConfig } from './user_menu';

/**
 * Chrome-Next APIs: header configuration, AI button slot, global search, user menu, and space selector.
 * @public
 */
export interface ChromeNext {
  header: {
    /**
     * Set the Chrome-Next header configuration for the current page.
     * Chrome renders the title, metadata, global actions, and app menu.
     *
     * Pass `undefined` to clear (e.g. on unmount or route change).
     * Automatically cleared on app change.
     */
    set(config?: ChromeNextHeaderConfig): void;
  };
  aiButton: {
    /**
     * Register an AI button for the Chrome-Next header.
     * Multiple plugins can register buttons; each owns its own visibility logic.
     * Chrome renders all registered buttons sorted by `order` in a fixed slot
     * at the far right of the header.
     * Returns an unregister callback. Global — persists across app changes.
     */
    register(button: ChromeNextAiButton): () => void;
  };
  globalSearch: {
    /**
     * Set the global search configuration for the Chrome-Next sidenav.
     * Chrome renders a search icon button in the sidenav header items; clicking it fires `onClick`.
     * Pass `undefined` to remove the button. Global — persists across app changes.
     */
    set(config?: ChromeNextGlobalSearchConfig): void;
  };
  userMenu: {
    /**
     * Set the user menu configuration for the Chrome-Next sidenav.
     * Chrome renders a user avatar in the sidenav footer with a popover listing the provided items.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: ChromeNextUserMenuConfig): void;
  };
  spaceSelector: {
    /**
     * Set the space selector configuration for the Chrome-Next sidenav.
     * Chrome renders a space avatar in the sidenav header with a custom popover.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: ChromeNextSpaceSelectorConfig): void;
  };
}
