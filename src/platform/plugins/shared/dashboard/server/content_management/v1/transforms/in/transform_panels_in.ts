/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import { isDashboardSection } from '../../../../../common';
import {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
  SavedDashboardSection,
} from '../../../../dashboard_saved_object';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';

export function transformPanelsIn(
  widgets: DashboardAttributes['panels'] | undefined,
  dropSections: boolean = false
): {
  panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
  sections: DashboardSavedObjectAttributes['sections'];
} {
  const panels: SavedDashboardPanel[] = [];
  const sections: SavedDashboardSection[] = [];

  widgets?.forEach((widget) => {
    if (isDashboardSection(widget)) {
      const { panels: sectionPanels, gridData, ...restOfSection } = widget as DashboardSection;
      const idx = gridData.i ?? uuidv4();
      sections.push({ ...restOfSection, gridData: { ...gridData, i: idx } });
      (sectionPanels as DashboardPanel[]).forEach((panel) => {
        const transformed = transformPanel(panel);
        panels.push({
          ...transformed,
          gridData: { ...transformed.gridData, ...(!dropSections && { sectionId: idx }) },
        });
      });
    } else {
      // widget is a panel
      panels.push(transformPanel(widget));
    }
  });
  return { panelsJSON: JSON.stringify(panels), sections };
}

function transformPanel(panel: DashboardPanel): SavedDashboardPanel {
  const { panelIndex, gridData, panelConfig, ...restPanel } = panel as DashboardPanel;
  const idx = panelIndex ?? uuidv4();
  return {
    ...restPanel,
    embeddableConfig: panelConfig,
    panelIndex: idx,
    gridData: {
      ...gridData,
      i: idx,
    },
  };
}
