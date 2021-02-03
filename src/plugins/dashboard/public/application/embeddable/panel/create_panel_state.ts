/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PanelState, EmbeddableInput } from '../../../services/embeddable';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';
import { DashboardPanelState } from '../types';
import {
  IPanelPlacementArgs,
  findTopLeftMostOpenSpace,
  PanelPlacementMethod,
} from './dashboard_panel_placement';

/**
 * Creates and initializes a basic panel state.
 */
export function createPanelState<
  TEmbeddableInput extends EmbeddableInput,
  TPlacementMethodArgs extends IPanelPlacementArgs = IPanelPlacementArgs
>(
  panelState: PanelState<TEmbeddableInput>,
  currentPanels: { [key: string]: DashboardPanelState },
  placementMethod?: PanelPlacementMethod<TPlacementMethodArgs>,
  placementArgs?: TPlacementMethodArgs
): DashboardPanelState<TEmbeddableInput> {
  const defaultPlacementArgs = {
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    currentPanels,
  };
  const finalPlacementArgs = placementArgs
    ? {
        ...defaultPlacementArgs,
        ...placementArgs,
      }
    : defaultPlacementArgs;

  const gridDataLocation = placementMethod
    ? placementMethod(finalPlacementArgs as TPlacementMethodArgs)
    : findTopLeftMostOpenSpace(defaultPlacementArgs);

  return {
    gridData: {
      ...gridDataLocation,
      i: panelState.explicitInput.id,
    },
    ...panelState,
  };
}
