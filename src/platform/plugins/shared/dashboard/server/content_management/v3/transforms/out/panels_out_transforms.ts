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
import { SavedDashboardPanel, SavedDashboardSection } from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';
import { getReferencesForPanelId, isDashboardSection } from '../../../../../common';

export interface TransformPanelsOutOptions {
  panelsJSON?: string;
  sections?: SavedDashboardSection[];
  embeddable: EmbeddableStart;
  references?: SavedObjectReference[];
}

export function transformPanelsOut({
  panelsJSON = '[]',
  sections = [],
  embeddable,
  references,
}: TransformPanelsOutOptions): DashboardAttributes['panels'] {
  // Step 1: Parse the panelsJSON
  const panels = JSON.parse(panelsJSON);

  // Step 2: Inject sections into panels and transform properties
  const panelsWithSections = injectSections(panels, sections);

  // Step 3: Inject panel references
  return injectPanelReferences(panelsWithSections, embeddable, references);
}

function injectSections(panels: SavedDashboardPanel[], sections: SavedDashboardSection[]) {
  const sectionsMap: { [uuid: string]: DashboardPanel | DashboardSection } = sections.reduce(
    (prev, section) => {
      const sectionId = section.gridData.i;
      return { ...prev, [sectionId]: { ...section, panels: [] } };
    },
    {}
  );
  panels.forEach((panel: SavedDashboardPanel) => {
    const { sectionId } = panel.gridData;
    if (sectionId) {
      (sectionsMap[sectionId] as DashboardSection).panels.push(transformPanelProperties(panel));
    } else {
      sectionsMap[panel.panelIndex] = transformPanelProperties(panel, embeddable);
    }
  });
  return Object.values(sectionsMap);
}

function transformPanelProperties(panel: SavedDashboardPanel, embeddable: EmbeddableStart) {
  const { embeddableConfig, gridData, id, panelIndex, panelRefName, title, type, version } = panel;
  const { sectionId, ...restOfGridData } = gridData; // drop section ID, if it exists
  return {
    gridData: restOfGridData,
    id,
    panelConfig: savedPanelToItem(embeddableConfig, type, embeddable),
    panelIndex,
    panelRefName,
    title,
    type,
    version,
  };
}

function injectPanelReferences(
  widgets: DashboardAttributes['panels'],
  embeddable: EmbeddableStart,
  references: SavedObjectReference[] = []
): Array<DashboardPanel | DashboardSection> {
  return widgets.map((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, ...restOfSection } = widget;
      // Only keep DashboardPanel in panels
      const injectedPanels = injectPanelReferences(sectionPanels, embeddable, references).filter(
        (p): p is DashboardPanel => !isDashboardSection(p)
      );
      return {
        ...restOfSection,
        panels: injectedPanels,
      };
    } else {
      if (!widget.panelIndex) return widget;
      const filteredReferences = getReferencesForPanelId(widget.panelIndex, references);
      const panelReferences = filteredReferences.length === 0 ? references : filteredReferences;
      const panelsWithSavedObjectIdInjected = injectPanelSavedObjectId(widget, panelReferences);
      return injectPanelEmbeddableReferences(
        panelsWithSavedObjectIdInjected,
        embeddable,
        panelReferences
      );
    }
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
  if (!embeddableConfig.attributes) return embeddableConfig;
  const embeddableCmDefintions = embeddable.getEmbeddableContentManagementDefinition(panelType);
  if (!embeddableCmDefintions) return embeddableConfig;
  const { savedObjectToItem } =
    embeddableCmDefintions.versions[embeddableCmDefintions.latestVersion];
  return savedObjectToItem?.(embeddableConfig as unknown as SavedObject) ?? embeddableConfig;
}
