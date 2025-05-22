/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';

import type { Reference } from '@kbn/content-management-utils';
import type { DashboardPanelMap } from '..';
import type { DashboardPanel } from '../../server/content_management';

import {
  getReferencesForPanelId,
  prefixReferencesFromPanel,
} from '../dashboard_container/persistable_state/dashboard_container_references';

export const convertPanelsArrayToPanelMap = (panels?: DashboardPanel[]): DashboardPanelMap => {
  const panelsMap: DashboardPanelMap = {};
  panels?.forEach((panel, idx) => {
    panelsMap![panel.panelIndex ?? String(idx)] = {
      type: panel.type,
      gridData: panel.gridData,
      explicitInput: panel.panelConfig,
      version: panel.version,
    };
  });
  return panelsMap;
};

export const convertPanelMapToPanelsArray = (
  panels: DashboardPanelMap,
  removeLegacyVersion?: boolean
) => {
  return Object.entries(panels).map(([panelId, panelState]) => {
    return {
      /**
       * Version information used to be stored in the panel until 8.11 when it was moved to live inside the
       * explicit Embeddable Input. If removeLegacyVersion is not passed, we'd like to keep this information for
       * the time being.
       */
      ...(!removeLegacyVersion ? { version: panelState.version } : {}),

      type: panelState.type,
      gridData: panelState.gridData,
      panelIndex: panelId,
      panelConfig: panelState.explicitInput,
    };
  });
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
      explicitInput: panel.explicitInput ?? {},
    };
    newReferences.push(
      ...prefixReferencesFromPanel(newId, getReferencesForPanelId(oldId, references ?? []))
    );
  }
  return { panels: newPanelsMap, references: newReferences };
};
