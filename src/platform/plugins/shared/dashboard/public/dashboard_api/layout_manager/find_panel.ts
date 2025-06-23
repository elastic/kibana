/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanel } from '../../../server';
import { DashboardState, isDashboardSection } from '../../../common';

export function findPanel(panels: DashboardState['panels'], panelId: string) {
  let targetPanel: DashboardPanel | undefined;
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    if (isDashboardSection(panel)) {
      const panelFromSection = findPanel(panel.panels as DashboardState['panels'], panelId);
      if (panelFromSection) {
        targetPanel = panelFromSection;
        break;
      }
    }

    if ((panel as DashboardPanel).panelIndex === panelId) {
      targetPanel = panel as DashboardPanel;
      break;
    }
  }

  return targetPanel;
}
