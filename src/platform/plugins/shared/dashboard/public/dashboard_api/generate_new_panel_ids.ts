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
import {
  DashboardState,
  getReferencesForPanelId,
  isDashboardSection,
  prefixReferencesFromPanel,
} from '../../common';

export function generateNewPanelIds(panels: DashboardState['panels'], references?: Reference[]) {
  const newPanels: DashboardState['panels'] = [];
  const newPanelReferences: Reference[] = [];

  function generateNewPanelId(panel: DashboardPanel) {
    const newPanelId = v4();
    const oldPanelId = panel.panelIndex ?? panel.gridData.i;
    const panelReferences =
      oldPanelId && references ? getReferencesForPanelId(oldPanelId, references) : [];

    newPanelReferences.push(...prefixReferencesFromPanel(newPanelId, panelReferences));

    return {
      ...panel,
      panelIndex: newPanelId,
      gridData: { ...panel.gridData, i: newPanelId },
    };
  }

  for (const panel of panels) {
    if (isDashboardSection(panel)) {
      const section = panel;
      const newSectionId = v4();
      newPanels.push({
        ...section,
        gridData: { ...section.gridData, i: newSectionId },
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
