/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import { omit } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import { SavedDashboardPanel } from '../schema/v2';
import {
  getReferencesForPanelId,
  prefixReferencesFromPanel,
} from './migrate_extract_panel_references/dashboard_container_references';
import { DashboardPanelMap810, DashboardPanelState810 } from './types';

export function convertSavedDashboardPanelToPanelState<PanelState extends object>(
  savedDashboardPanel: SavedDashboardPanel
): DashboardPanelState810<PanelState> {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    panelRefName: savedDashboardPanel.panelRefName,
    explicitInput: {
      id: savedDashboardPanel.panelIndex,
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    } as PanelState,

    /**
     * Version information used to be stored in the panel until 8.11 when it was moved
     * to live inside the explicit Embeddable Input. If version information is given here, we'd like to keep it.
     * It will be removed on Dashboard save
     */
    version: savedDashboardPanel.version,
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState810,
  removeLegacyVersion?: boolean
): SavedDashboardPanel {
  const savedObjectId = (panelState.explicitInput as { savedObjectId?: string }).savedObjectId;
  const title = (panelState.explicitInput as { title?: string }).title;
  return {
    /**
     * Version information used to be stored in the panel until 8.11 when it was moved to live inside the
     * explicit Embeddable Input. If removeLegacyVersion is not passed, we'd like to keep this information for
     * the time being.
     */
    ...(!removeLegacyVersion ? { version: panelState.version } : {}),

    type: panelState.type,
    gridData: panelState.gridData,
    panelIndex: (panelState.explicitInput as { id: string }).id,
    embeddableConfig: omit(
      panelState.explicitInput as { id: string; savedObjectId?: string; title?: string },
      ['id', 'savedObjectId', 'title']
    ),
    ...(title !== undefined && { title }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
    ...(panelState.panelRefName !== undefined && { panelRefName: panelState.panelRefName }),
  };
}

export const convertSavedPanelsToPanelMap = (
  panels?: SavedDashboardPanel[]
): DashboardPanelMap810 => {
  const panelsMap: DashboardPanelMap810 = {};
  panels?.forEach((panel, idx) => {
    panelsMap![panel.panelIndex ?? String(idx)] = convertSavedDashboardPanelToPanelState(panel);
  });
  return panelsMap;
};

export const convertPanelMapToSavedPanels = (
  panels: DashboardPanelMap810,
  removeLegacyVersion?: boolean
) => {
  return Object.values(panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, removeLegacyVersion)
  );
};

/**
 * When saving a dashboard as a copy, we should generate new IDs for all panels so that they are
 * properly refreshed when navigating between Dashboards
 */
export const generateNewPanelIds = (panels: DashboardPanelState810, references?: Reference[]) => {
  const newPanelsMap: DashboardPanelMap810 = {};
  const newReferences: Reference[] = [];
  for (const [oldId, panel] of Object.entries(panels)) {
    const newId = v4();
    newPanelsMap[newId] = {
      ...panel,
      gridData: { ...panel.gridData, i: newId },
      explicitInput: { ...panel.explicitInput, id: newId },
    };
    newReferences.push(
      ...prefixReferencesFromPanel(newId, getReferencesForPanelId(oldId, references ?? []))
    );
  }
  return { panels: newPanelsMap, references: newReferences };
};
