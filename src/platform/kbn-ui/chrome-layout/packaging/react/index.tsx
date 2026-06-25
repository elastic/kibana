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
import type { ChromeStyle } from '../../src/layout.types';
import {
  GridLayoutGlobalStyles,
  type GridLayoutGlobalStylesProps,
} from '../../src/layouts/grid_global_app_style';
import { CommonGlobalAppStyles } from '../../src/layouts/global_app_styles';
import { LayoutDebugOverlay } from '../../src/debug/layout_debug_overlay';

// React import is needed for JSX transform.
void React;

export type {
  ChromeLayoutProps as KbnChromeLayoutProps,
  ChromeStyle as KbnChromeStyle,
  GridLayoutGlobalStylesProps as KbnGridLayoutGlobalStylesProps,
};

/** Alias for the external package. */
export type KbnChromeLayoutConfig = LayoutConfig;
export type KbnChromeLayoutConfigProviderProps = LayoutConfigProviderProps;

export {
  ChromeLayout as KbnChromeLayout,
  GridLayoutGlobalStyles as KbnGridLayoutGlobalStyles,
  CommonGlobalAppStyles as KbnCommonGlobalAppStyles,
  LayoutDebugOverlay as KbnChromeLayoutDebugOverlay,
};

export const KbnChromeLayoutConfigProvider = LayoutConfigProvider;

export {
  useLayoutConfig as useKbnChromeLayoutConfig,
  useLayoutUpdate as useKbnChromeLayoutUpdate,
};
