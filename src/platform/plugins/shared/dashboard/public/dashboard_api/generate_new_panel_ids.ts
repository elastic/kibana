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
import type { DashboardPanel } from '../../server';
import type { DashboardState } from '../../common';
import {
  getReferencesForPanelId,
  isDashboardSection,
  prefixReferencesFromPanel,
} from '../../common';

export function generateNewPanelIds(panels: DashboardState['panels'], references?: Reference[]) {
  const newPanels: DashboardState['panels'] = [];
  const newPanelReferences: Reference[] = [];

  function generateNewPanelId(panel: DashboardPanel) {
    const newPanelId = v4();
    const oldPanelId = panel.uid ?? panel.grid.i;
    const panelReferences =
      oldPanelId && references ? getReferencesForPanelId(oldPanelId, references) : [];

    newPanelReferences.push(...prefixReferencesFromPanel(newPanelId, panelReferences));

    return {
      ...panel,
      uid: newPanelId,
      grid: { ...panel.grid, i: newPanelId },
    };
  }

  for (const panel of panels) {
    if (isDashboardSection(panel)) {
      const section = panel;
      const newSectionId = v4();
      newPanels.push({
        ...section,
        grid: { ...section.grid, i: newSectionId },
        panels: section.panels.map((panelInSection) => {
          return generateNewPanelId(panelInSection as DashboardPanel);
        }),
      });
    } else {
      newPanels.push(generateNewPanelId(panel));
    }
  }
  return { newPanels, newPanelReferences };
}
