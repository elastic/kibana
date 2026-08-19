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

export { LayoutDebugOverlay } from './src/debug/layout_debug_overlay';

export {
  GridLayoutGlobalStyles,
  type GridLayoutGlobalStylesProps,
} from './src/layouts/grid_global_app_style';

export {
  DESIGN_EXPLORATION_BODY_ATTR,
  DESIGN_EXPLORATION_VARIANT_ATTR,
  DESIGN_EXPLORATION_GAP,
  DESIGN_EXPLORATION_RADIUS_CONTAINER,
  DESIGN_EXPLORATION_RADIUS_CONTROL,
  DesignExplorationChromeGlobalStyles,
  designExplorationScope,
  designExplorationScopedInPanels,
} from './src/design_exploration/design_exploration_chrome_styles';

export { DesignExplorationKnobsPanel } from './src/design_exploration/design_exploration_knobs_panel';

export {
  TARGET_NAV_COLLAPSED_WIDTH,
  TARGET_NAV_EXPANDED_WIDTH,
  TARGET_SIDE_PANEL_WIDTH,
} from './src/design_exploration/variant_target';

export {
  DESIGN_EXPLORATION_KNOB_DEFINITIONS,
  DESIGN_EXPLORATION_KNOBS_SESSION_KEY,
  designExplorationKnobVar,
  getDesignExplorationKnobValues,
} from './src/design_exploration/design_exploration_knobs';
