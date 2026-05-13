/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayoutTweakpaneValues } from '../../dashboard_api/types';

import { DASHBOARD_DEFAULT_BACKGROUND_TOKEN } from './dashboard_background_tokens';

export const DASHBOARD_GRID_HEIGHT = 20;
export const DASHBOARD_MARGIN_SIZE = 8;
/** Left/right padding of the dashboard viewport (content inset). */
export const DASHBOARD_HORIZONTAL_PADDING_PX = 50;
export const DEFAULT_DASHBOARD_DRAG_TOP_OFFSET = 200;

/** Initial layout tweak values before Tweakpane sync (panel radius updated on mount from theme). */
export const INITIAL_DASHBOARD_LAYOUT_TWEAK: DashboardLayoutTweakpaneValues = {
  marginGutterPx: DASHBOARD_MARGIN_SIZE,
  horizontalPaddingPx: DASHBOARD_HORIZONTAL_PADDING_PX,
  panelBorderRadiusPx: 6,
  panelPaddingVerticalPx: 0,
  panelPaddingHorizontalPx: 0,
  dashboardBackgroundToken: DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
};
