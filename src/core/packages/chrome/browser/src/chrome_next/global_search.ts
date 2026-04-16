/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration for the global search button in the Chrome-Next sidenav.
 */
export interface ChromeNextGlobalSearchConfig {
  /** Called when the search icon button in the sidenav is clicked. */
  onClick: () => void;
  /** The keyboard shortcut key to trigger the global search modal. */
  shortcutKey?: string;
}
