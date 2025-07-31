/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semverSatisfies from 'semver/functions/satisfies';
import type { Reference } from '@kbn/content-management-utils';
import { SAVED_OBJECT_REF_NAME } from '@kbn/presentation-publishing';
import { DashboardState, prefixReferencesFromPanel } from '../../../../common';
import { coreServices } from '../../../services/kibana_services';
import { getPanelTooOldErrorString } from '../../_dashboard_app_strings';

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

export function extractPanelsState(state: { [key: string]: unknown }): {
  panels?: DashboardState['panels'];
  savedObjectReferences?: DashboardState['references'];
} {
  const panels = Array.isArray(state.panels) ? state.panels : [];

  if (panels.length === 0) {
    return {};
  }

  if (isPanelVersionTooOld(panels)) {
    coreServices.notifications.toasts.addWarning(getPanelTooOldErrorString());
    return {};
  }

  const savedObjectReferences: Reference[] = [];
  const standardizedPanels = panels.map((legacyPanel) => {
    const panel = typeof legacyPanel === 'object' ? { ...legacyPanel } : {};

    // < 8.17 panels state stored panelConfig as embeddableConfig
    if (panel?.embeddableConfig) {
      panel.panelConfig = panel.embeddableConfig;
      delete panel.embeddableConfig;
    }

    // <8.19 'id' (saved object id) stored as siblings to panelConfig
    if (panel.id && panel.panelConfig && typeof panel.panelConfig === 'object') {
      panel.panelConfig.savedObjectId = panel.id;
      delete panel.id;
    }

    // <8.19 'title' stored as siblings to panelConfig
    if (panel.title && panel.panelConfig && typeof panel.panelConfig === 'object') {
      panel.panelConfig.title = panel.title;
      delete panel.title;
    }

    // < 9.2 dashboard managed saved object refs for panels
    // Add saved object ref for panels that contain savedObjectId
    // TODO remove once all panels inject references in dashboard server api
    const { panelConfig, panelIndex, type } = panel;
    if (
      panelIndex &&
      type &&
      panelConfig?.savedObjectId &&
      typeof panelConfig?.savedObjectId === 'string'
    ) {
      savedObjectReferences.push(
        ...prefixReferencesFromPanel(panelIndex, [
          {
            id: panelConfig.savedObjectId,
            name: SAVED_OBJECT_REF_NAME,
            type,
          },
        ])
      );
    }

    return panel;
  });

  return {
    panels: standardizedPanels,
    savedObjectReferences: savedObjectReferences.length ? savedObjectReferences : undefined,
  };
}
