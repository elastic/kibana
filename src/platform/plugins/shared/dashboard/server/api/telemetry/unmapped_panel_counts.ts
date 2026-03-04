/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDashboardSection } from '../../../common';
import type {
  DashboardPanel,
  DashboardPinnedPanel,
  DashboardSection,
  DashboardState,
} from '../types';
import { embeddableService } from '../../kibana_services';

function isPinnedPanel(
  panel: DashboardPanel | DashboardPinnedPanel | DashboardSection
): panel is DashboardPinnedPanel {
  return !('grid' in panel);
}

export function getUnmappedPanelCountsFromDashboardState(dashboardState: DashboardState): {
  total: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  let total = 0;

  const allPanels = [...(dashboardState.panels ?? []), ...(dashboardState.pinned_panels ?? [])];

  const countUnmappedPanel = (panel: DashboardPanel | DashboardPinnedPanel) => {
    const transforms = embeddableService?.getTransforms(panel.type);

    if (transforms?.throwOnUnmappedPanel) {
      try {
        transforms.throwOnUnmappedPanel(panel.config);
      } catch {
        // unmapped panel config
        total += 1;
        byType[panel.type] = (byType[panel.type] ?? 0) + 1;
        return;
      }
    }

    if (!transforms?.schema) {
      total += 1;
      byType[panel.type] = (byType[panel.type] ?? 0) + 1;
      return;
    }

    if ((panel.config as { enhancements?: unknown })?.enhancements) {
      total += 1;
      byType[panel.type] = (byType[panel.type] ?? 0) + 1;
    }
  };

  allPanels.forEach((panelOrSection) => {
    if (isPinnedPanel(panelOrSection)) {
      countUnmappedPanel(panelOrSection);
      return;
    }

    if (isDashboardSection(panelOrSection)) {
      panelOrSection.panels.forEach(countUnmappedPanel);
      return;
    }

    countUnmappedPanel(panelOrSection);
  });

  return { total, byType };
}
