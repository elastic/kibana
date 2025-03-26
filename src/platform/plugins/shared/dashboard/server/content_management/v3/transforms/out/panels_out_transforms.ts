/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { SavedDashboardPanel } from '../../../../dashboard_saved_object';
import type { DashboardAttributes, DashboardPanel } from '../../types';
import { getReferencesForPanelId } from '../../../../../common';

export function transformPanelsOut(
  panelsJSON: string,
  embeddable: EmbeddableStart,
  references?: SavedObjectReference[]
): DashboardAttributes['panels'] {
  const transformedPanels = flow(JSON.parse, transformPanelsProperties)(panelsJSON);
  return injectPanelReferences(transformedPanels, embeddable, references);
}

function transformPanelsProperties(panels: SavedDashboardPanel[]) {
  return panels.map(
    ({ embeddableConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      panelConfig: embeddableConfig,
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}

function injectPanelReferences(
  panels: DashboardAttributes['panels'],
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = []
) {
  return panels.map((panel) => {
    const panelsWithSavedObjectIdInjected = injectPanelSavedObjectId(panel, references);
    return injectPanelEmbeddableReferences(panelsWithSavedObjectIdInjected, embeddable, references);
  });
}

function injectPanelEmbeddableReferences(
  panel: DashboardPanel,
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = []
) {
  if (!panel.panelIndex) return panel;
  const filteredReferences = getReferencesForPanelId(panel.panelIndex, references);
  const { type: embeddableType, ...injectedPanelConfig } = embeddable.inject(
    { type: panel.type, ...panel.panelConfig },
    filteredReferences
  );
  return {
    ...panel,
    panelConfig: injectedPanelConfig,
  };
}

function injectPanelSavedObjectId(panel: DashboardPanel, references: SavedObjectReference[]) {
  if (!panel.panelIndex) return panel;
  if (!panel.panelRefName) return panel;
  const filteredReferences = getReferencesForPanelId(panel.panelIndex, references);
  const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;
  const matchingReference = panelReferences.find(
    (reference) => reference.name === panel.panelRefName
  );

  if (!matchingReference) {
    throw new Error(`Could not find reference "${panel.panelRefName}"`);
  }

  const { panelRefName, ...injectedPanel } = panel;

  return {
    ...injectedPanel,
    panelConfig: {
      ...panel.panelConfig,
      savedObjectId: matchingReference.id,
    },
  };
}
