/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { DashboardAttributes, DashboardPanel } from '../../types';
import { prefixReferencesFromPanel } from '../../../../../common';

export function transformPanelsIn(
  panels: DashboardAttributes['panels'],
  embeddable: EmbeddableStart
): {
  panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
  references: SavedObjectReference[];
} {
  const panelsWithIndex = transformSetPanelIndex(panels);
  const { panels: extractedPanels, references: panelReferences } = extractPanelReferences(
    panelsWithIndex,
    embeddable
  );
  const panelsJSON = flow(transformPanelsProperties, JSON.stringify)(extractedPanels);
  return { panelsJSON, references: panelReferences };
}

function transformSetPanelIndex(panels: DashboardAttributes['panels']) {
  const updatedPanels = panels.map(({ panelIndex, gridData, ...restPanel }) => {
    const idx = panelIndex ?? uuidv4();
    return {
      ...restPanel,
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    };
  });
  return updatedPanels;
}

function extractPanelReferences(panels: DashboardPanel[], embeddable: EmbeddableStart) {
  const extractedPanels: DashboardPanel[] = [];
  const panelReferences: SavedObjectReference[] = [];
  panels.forEach((panel) => {
    const { panel: extractedPanel, references: embeddableReferences } =
      extractPanelEmbeddableReferences(panel, embeddable);

    const { panel: finalPanel, references: soReferences } =
      extractPanelSavedObjectId(extractedPanel);

    extractedPanels.push(finalPanel);
    panelReferences.push(...embeddableReferences, ...soReferences);
  });

  return { panels: extractedPanels, references: panelReferences };
}

function extractPanelEmbeddableReferences(panel: DashboardPanel, embeddable: EmbeddableStart) {
  if (!panel.panelIndex) return { panel, references: [] };
  const { state, references: extractedReferences } = embeddable.extract({
    type: panel.type,
    ...panel.panelConfig,
  });
  const { type, ...extractedPanelConfig } = state;
  return {
    panel: {
      ...panel,
      panelConfig: extractedPanelConfig,
    },
    references: prefixReferencesFromPanel(panel.panelIndex, extractedReferences),
  };
}

function extractPanelSavedObjectId(panel: DashboardPanel): {
  panel: DashboardPanel;
  references: SavedObjectReference[];
} {
  const { savedObjectId, ...panelConfig } = panel.panelConfig;
  if (!savedObjectId) return { panel, references: [] };
  const panelRefName = `panel_${panel.panelIndex}`;
  return {
    panel: {
      ...panel,
      panelRefName,
      panelConfig,
    },
    references: [
      {
        name: `${panel.panelIndex}:${panelRefName}`,
        type: panel.type,
        id: savedObjectId,
      },
    ],
  };
}

function transformPanelsProperties(panels: DashboardPanel[]) {
  return panels.map(
    ({ panelConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      embeddableConfig: panelConfig,
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}
