/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PanelState, EmbeddableInput, EmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../../common';
import { panelPlacementStrategies } from './place_new_panel_strategies';
import { IProvidesPanelPlacementSettings, PanelPlacementSettings } from './types';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../../dashboard_constants';

export const providesPanelPlacementSettings = (
  value: unknown
): value is IProvidesPanelPlacementSettings => {
  return Boolean((value as IProvidesPanelPlacementSettings).getPanelPlacementSettings);
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
  let placementSettings: PanelPlacementSettings = {
    width: DEFAULT_PANEL_WIDTH,
    height: DEFAULT_PANEL_HEIGHT,
    strategy: 'findTopLeftMostOpenSpace',
  };
  if (providesPanelPlacementSettings(factory)) {
    placementSettings = {
      ...placementSettings,
      ...factory.getPanelPlacementSettings(newPanel.explicitInput, attributes),
    };
  }
  const { width, height, strategy } = placementSettings;

  const { newPanelPlacement, otherPanels } = panelPlacementStrategies[strategy]({
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
