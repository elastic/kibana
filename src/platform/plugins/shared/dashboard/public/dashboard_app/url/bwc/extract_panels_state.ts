/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semverSatisfies from 'semver/functions/satisfies';
import { convertPanelsArrayToPanelSectionMaps } from '../../../../common/lib/dashboard_panel_converters';
import { DashboardState } from '../../../../common';
import { coreServices } from '../../../services/kibana_services';
import { getPanelTooOldErrorString } from '../../_dashboard_app_strings';

type PanelState = Pick<DashboardState, 'panels' | 'sections'>;

/**
 * We no longer support loading panels from a version older than 7.3 in the URL.
 * @returns whether or not there is a panel in the URL state saved with a version before 7.3
 */
const isPanelVersionTooOld = (panels: unknown[]) => {
  for (const panel of panels) {
    if (!panel || typeof panel !== 'object' || 'panels' in panel) {
      continue;
    }

    const panelAsObject = panel as { [key: string]: unknown };

    if (
      !panelAsObject.gridData ||
      !(panelAsObject.panelConfig || panelAsObject.embeddableConfig) ||
      (panelAsObject.version && semverSatisfies(panelAsObject.version as string, '<7.3'))
    )
      return true;
  }
  return false;
};

export function extractPanelsState(state: { [key: string]: unknown }): Partial<PanelState> {
  const panels = Array.isArray(state.panels) ? state.panels : [];

  if (panels.length === 0) {
    return {};
  }

  if (isPanelVersionTooOld(panels)) {
    coreServices.notifications.toasts.addWarning(getPanelTooOldErrorString());
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
