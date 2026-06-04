/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ChromeLayout, type ChromeLayoutProps } from './src/layout';

export {
  LayoutConfigProvider as ChromeLayoutConfigProvider,
  type LayoutConfig as ChromeLayoutConfig,
  type LayoutConfigProviderProps as ChromeLayoutConfigProviderProps,
  useLayoutUpdate,
  useLayoutConfig,
} from './src/layout_config_context';

export type { ChromeStyle } from './src/layout.types';

export { LayoutDebugOverlay } from './src/debug/layout_debug_overlay';

export {
  GridLayoutGlobalStyles,
  type GridLayoutGlobalStylesProps,
} from './src/layouts/grid_global_app_style';

export { CommonGlobalAppStyles } from './src/layouts/global_app_styles';
