/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 } from 'uuid';
import { omit } from 'lodash';
import { EmbeddableInput, SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/common';

import { Reference } from '@kbn/content-management-utils';
import { DashboardPanelMap, DashboardPanelState } from '..';
import { SavedDashboardPanel } from '../content_management';
import {
  getReferencesForPanelId,
  prefixReferencesFromPanel,
} from '../dashboard_container/persistable_state/dashboard_container_references';

export function convertSavedDashboardPanelToPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
>(savedDashboardPanel: SavedDashboardPanel): DashboardPanelState<TEmbeddableInput> {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    panelRefName: savedDashboardPanel.panelRefName,
    explicitInput: {
      id: savedDashboardPanel.panelIndex,
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    } as TEmbeddableInput,

    /**
     * Version information used to be stored in the panel until 8.11 when it was moved
     * to live inside the explicit Embeddable Input. If version information is given here, we'd like to keep it.
     * It will be removed on Dashboard save
     */
    version: savedDashboardPanel.version,
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState,
  removeLegacyVersion?: boolean
): SavedDashboardPanel {
  const savedObjectId = (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId;
  return {
    /**
     * Version information used to be stored in the panel until 8.11 when it was moved to live inside the
     * explicit Embeddable Input. If removeLegacyVersion is not passed, we'd like to keep this information for
     * the time being.
     */
    ...(!removeLegacyVersion ? { version: panelState.version } : {}),

    type: panelState.type,
    gridData: panelState.gridData,
    panelIndex: panelState.explicitInput.id,
    embeddableConfig: omit(panelState.explicitInput, ['id', 'savedObjectId', 'title']),
    ...(panelState.explicitInput.title !== undefined && { title: panelState.explicitInput.title }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
    ...(panelState.panelRefName !== undefined && { panelRefName: panelState.panelRefName }),
  };
}

export const convertSavedPanelsToPanelMap = (panels?: SavedDashboardPanel[]): DashboardPanelMap => {
  const panelsMap: DashboardPanelMap = {};
  panels?.forEach((panel, idx) => {
    panelsMap![panel.panelIndex ?? String(idx)] = convertSavedDashboardPanelToPanelState(panel);
  });
  return panelsMap;
};

export const convertPanelMapToSavedPanels = (
  panels: DashboardPanelMap,
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
export const generateNewPanelIds = (panels: DashboardPanelMap, references?: Reference[]) => {
  const newPanelsMap: DashboardPanelMap = {};
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
