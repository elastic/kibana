/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
): {
  newPanel: DashboardPanelState<TEmbeddableInput>;
  otherPanels: { [key: string]: DashboardPanelState };
} {
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

  const { newPanelPlacement, otherPanels } = placementMethod
    ? placementMethod(finalPlacementArgs as TPlacementMethodArgs)
    : findTopLeftMostOpenSpace(defaultPlacementArgs);

  return {
    newPanel: {
      gridData: {
        ...newPanelPlacement,
        i: panelState.explicitInput.id,
      },
      ...panelState,
    },
    otherPanels,
  };
}
