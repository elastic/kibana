/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Build-time type validation — causes build failure if types diverge.
import './type_validation';

import React from 'react';
import { ChromeLayout } from '../../src/layout';
import type { ChromeLayoutProps } from '../../src/layout';
import {
  LayoutConfigProvider,
  useLayoutConfig,
  useLayoutUpdate,
} from '../../src/layout_config_context';
import type { LayoutConfig, LayoutConfigProviderProps } from '../../src/layout_config_context';
import type { LayoutAppearance } from '../../src/layout.types';
import {
  GridLayoutGlobalStyles,
  type GridLayoutGlobalStylesProps,
} from '../../src/layouts/grid_global_app_style';
import { LayoutDebugOverlay } from '../../src/debug/layout_debug_overlay';
import {
  layoutVar,
  layoutVarName,
  layoutLevels,
  APP_MAIN_SCROLL_CONTAINER_ID,
  FLYOUT_SELECTOR,
  MAIN_CONTENT_SELECTORS,
  SIDE_PANEL_CONTENT_GAP,
  euiIncludeSelectorInFocusTrap,
} from '../../src/constants';
import {
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
  getHighContrastBorder,
  getHighContrastSeparator,
  useCurrentChromeApplicationBreakpoint,
  useIsWithinChromeApplicationBreakpoints,
} from '../../src/utils';
import type { ScrollContainer, HighContrastSeparatorOptions } from '../../src/utils';
import type {
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
} from '../../src/constants';

// React import is needed for JSX transform.
void React;

export type {
  ChromeLayoutProps,
  LayoutAppearance,
  GridLayoutGlobalStylesProps,
  LayoutVarName,
  CSSVarName,
  LayoutComponent,
  LayoutProperty,
  ApplicationComponent,
  ApplicationVarName,
  ScrollContainer,
  HighContrastSeparatorOptions,
};

/** Alias for the external package. */
export type ChromeLayoutConfig = LayoutConfig;
export type ChromeLayoutConfigProviderProps = LayoutConfigProviderProps;

export { ChromeLayout, GridLayoutGlobalStyles, LayoutDebugOverlay };

export {
  layoutVar,
  layoutVarName,
  layoutLevels,
  APP_MAIN_SCROLL_CONTAINER_ID,
  FLYOUT_SELECTOR,
  MAIN_CONTENT_SELECTORS,
  SIDE_PANEL_CONTENT_GAP,
  euiIncludeSelectorInFocusTrap,
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
  getHighContrastBorder,
  getHighContrastSeparator,
  useCurrentChromeApplicationBreakpoint,
  useIsWithinChromeApplicationBreakpoints,
};

export const ChromeLayoutConfigProvider = LayoutConfigProvider;

export { useLayoutConfig, useLayoutUpdate };
