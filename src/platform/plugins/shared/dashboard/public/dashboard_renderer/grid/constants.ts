/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayoutTweakpaneValues } from '../../dashboard_api/types';

import {
  DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
  DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
} from './dashboard_background_tokens';
import { DASHBOARD_DEFAULT_MAX_WIDTH_PX } from './dashboard_layout_max_width';

export const DASHBOARD_GRID_HEIGHT = 20;
export const DASHBOARD_MARGIN_SIZE = 8;
/** Upper bound (px) for Tweakpane markdown corner padding (right/bottom) on markdown panels. */
export const DASHBOARD_MARKDOWN_CORNER_PADDING_MAX_PX = 400;
/** Tweakpane bounds for panel title font size. */
export const DASHBOARD_PANEL_TITLE_FONT_SIZE_MIN_PX = 10;
export const DASHBOARD_PANEL_TITLE_FONT_SIZE_MAX_PX = 24;
export const DASHBOARD_DEFAULT_PANEL_TITLE_FONT_SIZE_PX = 14;
export const DEFAULT_DASHBOARD_DRAG_TOP_OFFSET = 200;

/** Initial layout tweak values before Tweakpane sync (panel radius updated on mount from theme). */
export const INITIAL_DASHBOARD_LAYOUT_TWEAK: DashboardLayoutTweakpaneValues = {
  marginGutterPx: DASHBOARD_MARGIN_SIZE,
  maxWidthPx: DASHBOARD_DEFAULT_MAX_WIDTH_PX,
  panelBorderRadiusPx: 6,
  panelTitleFontSizePx: DASHBOARD_DEFAULT_PANEL_TITLE_FONT_SIZE_PX,
  panelPaddingVerticalPx: 0,
  panelPaddingHorizontalPx: 0,
  markdownCornerPaddingBottomPx: 0,
  markdownCornerPaddingRightPx: 0,
  dashboardBackgroundToken: DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
  lightModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
  darkModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
};
