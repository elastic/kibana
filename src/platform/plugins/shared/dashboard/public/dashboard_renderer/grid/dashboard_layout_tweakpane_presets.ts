/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public License
 * v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayoutTweakpaneValues } from '../../dashboard_api/types';

import {
  DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
  DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
} from './dashboard_background_tokens';
import { DASHBOARD_DEFAULT_PANEL_TITLE_FONT_SIZE_PX, DASHBOARD_MARGIN_SIZE } from './constants';
import { DASHBOARD_DEFAULT_MAX_WIDTH_PX } from './dashboard_layout_max_width';

/** A named bundle of layout tweak values for the dashboard Tweakpane. */
export interface DashboardLayoutTweakpanePreset {
  readonly id: string;
  readonly label: string;
  readonly values: DashboardLayoutTweakpaneValues;
}

export const DASHBOARD_LAYOUT_TWEAKPANE_CURRENT_STATE_PRESET_ID = 'current_state';
export const DASHBOARD_LAYOUT_TWEAKPANE_PRESET_A_ID = 'preset_a';

/**
 * Built-in presets for the dashboard layout Tweakpane. Append more entries here
 * (or compose this array) as new named layouts are defined.
 */
export function getDashboardLayoutTweakpanePresets(
  defaultPanelBorderRadiusPx: number
): readonly DashboardLayoutTweakpanePreset[] {
  return [
    {
      id: DASHBOARD_LAYOUT_TWEAKPANE_CURRENT_STATE_PRESET_ID,
      label: 'Current state',
      values: {
        marginGutterPx: DASHBOARD_MARGIN_SIZE,
        maxWidthPx: DASHBOARD_DEFAULT_MAX_WIDTH_PX,
        panelBorderRadiusPx: defaultPanelBorderRadiusPx,
        panelTitleFontSizePx: DASHBOARD_DEFAULT_PANEL_TITLE_FONT_SIZE_PX,
        panelPaddingVerticalPx: 0,
        panelPaddingHorizontalPx: 0,
        markdownCornerPaddingBottomPx: 0,
        markdownCornerPaddingRightPx: 0,
        dashboardBackgroundToken: DASHBOARD_DEFAULT_BACKGROUND_TOKEN,
        lightModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
        darkModePanelBackgroundToken: DASHBOARD_DEFAULT_PANEL_BACKGROUND_TOKEN,
      },
    },
    {
      id: DASHBOARD_LAYOUT_TWEAKPANE_PRESET_A_ID,
      label: 'Preset A',
      values: {
        marginGutterPx: 14,
        maxWidthPx: 1920,
        panelBorderRadiusPx: 8,
        panelTitleFontSizePx: 16,
        panelPaddingVerticalPx: 10,
        panelPaddingHorizontalPx: 12,
        markdownCornerPaddingBottomPx: 0,
        markdownCornerPaddingRightPx: 80,
        dashboardBackgroundToken: 'backgroundBaseSubdued',
        lightModePanelBackgroundToken: 'backgroundBasePlain',
        darkModePanelBackgroundToken: 'backgroundBasePlain',
      },
    },
  ];
}
