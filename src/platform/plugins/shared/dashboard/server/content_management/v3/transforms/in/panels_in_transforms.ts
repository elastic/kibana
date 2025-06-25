/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { SavedObjectReference } from '@kbn/core/server';
import { isDashboardSection, prefixReferencesFromPanel } from '../../../../../common';
import {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
  SavedDashboardSection,
} from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';

export function transformPanelsIn(
  widgets: DashboardAttributes['panels'] | undefined,
  embeddable: EmbeddableStart,
  dropSections: boolean = false
): {
  panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
  sections: DashboardSavedObjectAttributes['sections'];
  references: SavedObjectReference[];
} {
  const panels: SavedDashboardPanel[] = [];
  const sections: SavedDashboardSection[] = [];
  const references: SavedObjectReference[] = [];

  widgets?.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, gridData, ...restOfSection } = widget as DashboardSection;
      const idx = gridData.i ?? uuidv4();
      sections.push({ ...restOfSection, gridData: { ...gridData, i: idx } });
      (sectionPanels as DashboardPanel[]).forEach((panel) => {
        const transformed = transformPanel(panel, embeddable);
        panels.push({
          ...transformed.panel,
          gridData: { ...transformed.panel.gridData, ...(!dropSections && { sectionId: idx }) },
        });
        if (transformed.references) {
          references.push(
            ...prefixReferencesFromPanel(transformed.panel.panelIndex, transformed.references)
          );
        }
      });
    } else {
      // widget is a panel
      const transformed = transformPanel(widget, embeddable);
      panels.push(transformed.panel);
      if (transformed.references) {
        references.push(
          ...prefixReferencesFromPanel(transformed.panel.panelIndex, transformed.references)
        );
      }
    }
  });
  return { panelsJSON: JSON.stringify(panels), sections, references };
}

function transformPanel(
  panel: DashboardPanel,
  embeddable: EmbeddableStart
): {
  panel: SavedDashboardPanel;
  references?: SavedObjectReference[];
} {
  const { panelIndex, gridData, panelConfig, ...restPanel } = panel as DashboardPanel;
  const idx = panelIndex ?? uuidv4();
  const transforms = embeddable.getTransforms(panel.type);
  const { state, references } = transforms?.transformIn
    ? transforms.transformIn(panelConfig)
    : {
        state: panelConfig,
        references: undefined,
      };
  return {
    panel: {
      ...restPanel,
      embeddableConfig: state as SavedDashboardPanel['embeddableConfig'],
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    },
    references,
  };
}