/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertPanelsArrayToPanelSectionMaps } from '../../../../common/lib/dashboard_panel_converters';
import { DashboardState } from '../../../../common';

type PanelState = Pick<DashboardState, 'panels', 'sections'>;

export function extractPanelsState(state: { [key: string]: unknown }): Partial<PanelState> {
  const panels = Array.isArray(state.panels) ? state.panels : [];

  if (panels.length === 0) {
    return {};
  }

  // < 8.17 panels state stored panelConfig as embeddableConfig
  const standardizedPanels = panels.map((panel) => {
    if (typeof panel === 'object' && panel?.embeddableConfig) {
      const { embeddableConfig, ...rest } = panel;
      return {
        ...rest,
        panelConfig: embeddableConfig,
      };
    }
    return panel;
  });

  return convertPanelsArrayToPanelSectionMaps(standardizedPanels);
}
