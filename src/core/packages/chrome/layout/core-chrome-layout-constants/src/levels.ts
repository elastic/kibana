/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Z-index levels for layout components
export const layoutLevels = {
  // Base application content layer
  content: 0,

  // Primary layout components that should appear above content
  header: 100,
  footer: 100,

  // 999 is chosen to be the same as old EuiCollapsibleNavBeta for backwards compatibility
  navigation: 999,

  // Interactive layout components that need higher priority than euiFlyout (1000)
  sidebar: 1050,
  banner: 1050,

  // Application-level bars that appear within main content
  applicationTopBar: 100,
  applicationBottomBar: 100,

  // Debug and development tools - highest priority
  debug: 9999,
};
