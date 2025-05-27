/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { SavedDashboardPanel } from '../../../../dashboard_saved_object';
import type { DashboardAttributes, DashboardPanel } from '../../types';
import { getReferencesForPanelId } from '../../../../../common';

export function transformPanelsOut(
  panelsJSON: string,
  embeddable: EmbeddableStart,
  references?: SavedObjectReference[]
): DashboardAttributes['panels'] {
  const parsedPanels = JSON.parse(panelsJSON);
  const transformedPanels = transformPanelsProperties(parsedPanels, embeddable);
  return injectPanelReferences(transformedPanels, embeddable, references);
}

function transformPanelsProperties(panels: SavedDashboardPanel[], embeddable: EmbeddableStart) {
  return panels.map(
    ({ embeddableConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      panelConfig: savedPanelToItem(embeddableConfig, type, embeddable),
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
    if (!panel.panelIndex) return panel;
    // some older dashboards may not have references prefixed with the panel index
    // so if we don't find any references for the panel id, use all the references
    const filteredReferences = getReferencesForPanelId(panel.panelIndex, references);
    const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;
    const panelsWithSavedObjectIdInjected = injectPanelSavedObjectId(panel, panelReferences);
    return injectPanelEmbeddableReferences(
      panelsWithSavedObjectIdInjected,
      embeddable,
      panelReferences
    );
  });
}

function injectPanelEmbeddableReferences(
  panel: DashboardPanel,
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = []
) {
  const state = embeddable.inject({ type: panel.type, ...panel.panelConfig }, references);
  const { type, ...injectedPanelConfig } = state;
  return {
    ...panel,
    panelConfig: injectedPanelConfig,
  };
}

function injectPanelSavedObjectId(panel: DashboardPanel, references: SavedObjectReference[]) {
  if (!panel.panelRefName) return panel;
  const matchingReference = references.find((reference) => reference.name === panel.panelRefName);

  if (!matchingReference) {
    throw new Error(`Could not find reference "${panel.panelRefName}"`);
  }

  const { panelRefName, ...injectedPanel } = panel;

  return {
    ...injectedPanel,
    type: matchingReference.type,
    panelConfig: {
      ...panel.panelConfig,
      savedObjectId: matchingReference.id,
    },
  };
}

function savedPanelToItem(
  embeddableConfig: SavedDashboardPanel['embeddableConfig'],
  panelType: SavedDashboardPanel['type'],
  embeddable: EmbeddableStart
) {
  const embeddableCmDefintions = embeddable.getEmbeddableContentManagementDefinition(panelType);
  if (!embeddableCmDefintions) return embeddableConfig;
  const { savedObjectToItem } =
    embeddableCmDefintions.versions[embeddableCmDefintions.latestVersion];
  return savedObjectToItem?.(embeddableConfig as unknown as SavedObject) ?? embeddableConfig;
}
