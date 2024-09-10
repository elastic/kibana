/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  initialState as flyoutPanelsInitialState,
  State as FlyoutPanelsState,
} from './panels_state';
import {
  initialState as pushVsOverlayInitialState,
  State as PushVsOverlayState,
} from './push_vs_overlay_state';
import { initialState as widthsInitialState, State as WidthsState } from './widths_state';
import {
  initialState as internalPercentagesInitialState,
  State as InternalPercentagesState,
} from './internal_percentages_state';
import {
  initialState as defaultWidthsInitialState,
  State as DefaultWidthsState,
} from './default_widths_state';

export interface State {
  /**
   * Store the panels for multiple flyouts
   */
  panels: FlyoutPanelsState;
  /**
   *
   */
  pushVsOverlay: PushVsOverlayState;
  /**
   *
   */
  widths: WidthsState;
  /**
   *
   */
  internalPercentages: InternalPercentagesState;
  /**
   *
   */
  defaultWidths: DefaultWidthsState;
}

export const initialState: State = {
  panels: flyoutPanelsInitialState,
  pushVsOverlay: pushVsOverlayInitialState,
  widths: widthsInitialState,
  internalPercentages: internalPercentagesInitialState,
  defaultWidths: defaultWidthsInitialState,
};
