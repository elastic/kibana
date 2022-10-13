/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupInput, ControlsPanels } from '..';

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
