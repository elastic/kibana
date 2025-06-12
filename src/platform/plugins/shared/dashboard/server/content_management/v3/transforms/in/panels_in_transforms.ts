/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardSection,
} from '../../../../dashboard_saved_object';
import type { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';
import { isDashboardSection, prefixReferencesFromPanel } from '../../../../../common';

export function transformPanelsIn(
  widgets: DashboardAttributes['panels'] | undefined,
  embeddable: EmbeddableStart,
  dropSections: boolean = false
): {
  panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
  sections: DashboardSavedObjectAttributes['sections'];
  references: SavedObjectReference[];
} {
  if (!widgets) return { panelsJSON: '[]', sections: [], references: [] };

  // Step 1: Add a panelIndex to each panel if necessary
  const panelsWithIndex = transformSetPanelIndex(widgets);

  // Step 2: Extract panel references
  const { panels: extractedPanels, references } = extractPanelReferences(
    panelsWithIndex as DashboardPanel[],
    embeddable
  );

  // Step 3: Extract sections from panels
  const { panels: panelsWithSections, sections } = extractSections(extractedPanels, dropSections);

  // Step 4: Transform panels properties
  const transformedPanels = transformPanelsProperties(panelsWithSections, embeddable);

  // Step 5: Stringify panels
  const panelsJSON = JSON.stringify(transformedPanels);

  return { panelsJSON, sections, references };
}

function transformSetPanelIndex(
  widgets: Array<DashboardPanel | DashboardSection>
): Array<DashboardPanel | DashboardSection> {
  return widgets.map((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, gridData, ...restOfSection } = widget;
      const sectionIdx = gridData.i ?? uuidv4();
      // Only panels inside a section
      const transformedPanels = transformSetPanelIndex(sectionPanels as DashboardPanel[]).filter(
        (p): p is DashboardPanel => !isDashboardSection(p)
      );
      return {
        ...restOfSection,
        gridData: { ...gridData, i: sectionIdx },
        panels: transformedPanels,
      };
    }
    const { panelIndex, gridData, ...restPanel } = widget;
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
}

function extractPanelReferences(
  widgets: Array<DashboardPanel | DashboardSection>,
  embeddable: EmbeddableStart
) {
  const extractedPanels: Array<DashboardPanel | DashboardSection> = [];
  const panelReferences: SavedObjectReference[] = [];
  widgets.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, ...restOfSection } = widget;
      const { panels, references } = extractPanelReferences(
        sectionPanels as DashboardPanel[],
        embeddable
      );
      // Filter the panels so only DashboardPanel objects are included in the section panels
      extractedPanels.push({
        ...restOfSection,
        panels: panels.filter((p): p is DashboardPanel => !isDashboardSection(p)),
      });
      panelReferences.push(...references);
    } else {
      const { panel: extractedPanel, references: embeddableReferences } =
        extractPanelEmbeddableReferences(widget, embeddable);

      const { panel: finalPanel, references: soReferences } =
        extractPanelSavedObjectId(extractedPanel);

      extractedPanels.push(finalPanel);
      panelReferences.push(...embeddableReferences, ...soReferences);
    }
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

function extractSections(widgets: Array<DashboardPanel | DashboardSection>, dropSections: boolean) {
  const sections: SavedDashboardSection[] = [];
  const panels: DashboardPanel[] = [];
  widgets.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, ...restOfSection } = widget;
      sections.push(restOfSection);
      panels.push(
        ...(sectionPanels as DashboardPanel[]).map(({ gridData, ...restPanel }) => ({
          ...restPanel,
          gridData: { ...gridData, ...(!dropSections && { sectionId: restOfSection.gridData.i }) },
        }))
      );
    } else {
      panels.push(widget);
    }
  });
  return { panels, sections };
}

function panelToSavedObject(
  panelConfig: DashboardPanel['panelConfig'],
  panelType: DashboardPanel['type'],
  embeddable: EmbeddableStart
) {
  const embeddableCmDefintions = embeddable.getEmbeddableContentManagementDefinition(panelType);
  if (!embeddableCmDefintions) return panelConfig;
  const { itemToSavedObject } =
    embeddableCmDefintions.versions[embeddableCmDefintions.latestVersion];
  return itemToSavedObject?.(panelConfig) ?? panelConfig;
}

function transformPanelsProperties(panels: DashboardPanel[], embeddable: EmbeddableStart) {
  return panels.map(
    ({ panelConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      embeddableConfig: panelToSavedObject(panelConfig, type, embeddable),
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}
