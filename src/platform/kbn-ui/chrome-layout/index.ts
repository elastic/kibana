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

export type { LayoutAppearance } from './src/layout.types';

export { isAgentFirst } from './src/agent_first_flag';
export { AGENT_FIRST_LAYOUT_OVERRIDES } from './src/agent_first/agent_first_layout';
export { resolveAgentPanelTargetWidth } from './src/agent/resolve_agent_panel_target_width';

export { LayoutDebugOverlay } from './src/debug/layout_debug_overlay';

export {
  GridLayoutGlobalStyles,
  type GridLayoutGlobalStylesProps,
} from './src/layouts/grid_global_app_style';

export {
  layoutVar,
  layoutVarName,
  layoutLevels,
  APP_MAIN_SCROLL_CONTAINER_ID,
  FLYOUT_SELECTOR,
  MAIN_CONTENT_SELECTORS,
  SIDE_PANEL_CONTENT_GAP,
  DEFAULT_AGENT_WIDTH,
  MIN_AGENT_WIDTH,
  MIN_APPLICATION_WORKSPACE_WIDTH,
  clampAgentWorkspaceWidth,
  getSoloAgentWorkspaceWidth,
  AGENT_FIRST_GAP,
  AGENT_FIRST_NAV_MARGIN_TOP,
  AGENT_FIRST_FEATURE_FLAG_KEY,
  euiIncludeSelectorInFocusTrap,
} from './src/constants';
export type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from './src/constants';

export {
  type ScrollContainer,
  getScrollContainer,
  scrollTo,
  scrollToTop,
  scrollToBottom,
  getViewportHeight,
  getViewportBoundaries,
  getScrollPosition,
  getScrollDimensions,
  scrollBy,
  isAtBottomOfPage,
  type HighContrastSeparatorOptions,
  getHighContrastBorder,
  getHighContrastSeparator,
  useCurrentChromeApplicationBreakpoint,
  useIsWithinChromeApplicationBreakpoints,
} from './src/utils';
