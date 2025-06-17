/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import semverSatisfies from 'semver/functions/satisfies';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedObject } from '@kbn/core/server';
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

export async function extractPanelsState(
  state: { [key: string]: unknown },
  embeddableService: EmbeddableStart
): Promise<Partial<PanelState>> {
  const panels = Array.isArray(state.panels) ? state.panels : [];

  if (panels.length === 0) {
    return {};
  }

  if (isPanelVersionTooOld(panels)) {
    coreServices.notifications.toasts.addWarning(getPanelTooOldErrorString());
    return {};
  }

  const standardizedPanels = await Promise.all(
    panels.map(async (panel) => {
      if (typeof panel === 'object') {
        // < 8.17 panels state stored panelConfig as embeddableConfig
        const panelConfig = panel.panelConfig ?? panel.embeddableConfig;
        const { type } = panel;

        const embeddableCmDefintions =
          await embeddableService.getEmbeddableContentManagementDefinition(type);
        if (!embeddableCmDefintions) return { ...panel, panelConfig };
        const { savedObjectToItem } =
          embeddableCmDefintions.versions[embeddableCmDefintions.latestVersion];
        return {
          ...panel,
          panelConfig: savedObjectToItem?.(panelConfig as unknown as SavedObject) ?? panelConfig,
        };
      }
      return panel;
    })
  );

  return convertPanelsArrayToPanelSectionMaps(standardizedPanels);
}
