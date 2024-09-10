/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupInput, ControlPanelState, ControlsPanels } from '..';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from '../options_list/types';

export const makeControlOrdersZeroBased = (input: ControlGroupInput) => {
  if (
    input.panels &&
    typeof input.panels === 'object' &&
    Object.keys(input.panels).length > 0 &&
    !Object.values(input.panels).find((panel) => (panel.order ?? 0) === 0)
  ) {
    // 0th element could not be found. Reorder all panels from 0;
    const newPanels = Object.values(input.panels)
      .sort((a, b) => (a.order > b.order ? 1 : -1))
      .map((panel, index) => {
        panel.order = index;
        return panel;
      })
      .reduce((acc, currentPanel) => {
        acc[currentPanel.explicitInput.id] = currentPanel;
        return acc;
      }, {} as ControlsPanels);
    input.panels = newPanels;
  }
  return input;
};

/**
 * The UX for the "Allow include/exclude" and "Allow exists query" toggles was removed in 8.7.0 so, to
 * prevent users from getting stuck when migrating from 8.6.0 (when the toggles were introduced) to 8.7.0
 * we must set both the `hideExclude` and `hideExists` keys to `undefined` for all existing options
 * list controls.
 */
export const removeHideExcludeAndHideExists = (input: ControlGroupInput) => {
  if (input.panels && typeof input.panels === 'object' && Object.keys(input.panels).length > 0) {
    const newPanels = Object.keys(input.panels).reduce<ControlsPanels>(
      (panelAccumulator, panelId) => {
        const panel: ControlPanelState = input.panels[panelId];
        if (panel.type === OPTIONS_LIST_CONTROL) {
          const explicitInput = panel.explicitInput as OptionsListEmbeddableInput;
          delete explicitInput.hideExclude;
          delete explicitInput.hideExists;
        }
        return {
          ...panelAccumulator,
          [panelId]: panel,
        };
      },
      {}
    );
    input.panels = newPanels;
  }
  return input;
};
