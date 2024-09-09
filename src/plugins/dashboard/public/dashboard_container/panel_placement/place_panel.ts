/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelState, EmbeddableInput, EmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../common';
import { IProvidesLegacyPanelPlacementSettings } from './types';
import { runPanelPlacementStrategy } from './place_new_panel_strategies';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  PanelPlacementStrategy,
} from '../../dashboard_constants';

export const providesLegacyPanelPlacementSettings = (
  value: unknown
): value is IProvidesLegacyPanelPlacementSettings => {
  return Boolean((value as IProvidesLegacyPanelPlacementSettings).getLegacyPanelPlacementSettings);
};

export function placePanel<TEmbeddableInput extends EmbeddableInput>(
  factory: EmbeddableFactory,
  newPanel: PanelState<TEmbeddableInput>,
  currentPanels: { [key: string]: DashboardPanelState },
  attributes?: unknown
): {
  newPanel: DashboardPanelState<TEmbeddableInput>;
  otherPanels: { [key: string]: DashboardPanelState };
} {
  let placementSettings = {
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    strategy: PanelPlacementStrategy.findTopLeftMostOpenSpace,
  };
  if (providesLegacyPanelPlacementSettings(factory)) {
    placementSettings = {
      ...placementSettings,
      ...factory.getLegacyPanelPlacementSettings(newPanel.explicitInput, attributes),
    };
  }
  const { width, height, strategy } = placementSettings;

  const { newPanelPlacement, otherPanels } = runPanelPlacementStrategy(strategy, {
    currentPanels,
    height,
    width,
  });

  return {
    newPanel: {
      gridData: {
        ...newPanelPlacement,
        i: newPanel.explicitInput.id,
      },
      ...newPanel,
    },
    otherPanels,
  };
}
