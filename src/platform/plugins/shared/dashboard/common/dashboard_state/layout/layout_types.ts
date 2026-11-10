/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PinnedControlLayoutState as PinnedPanelLayoutState } from '@kbn/controls-schemas';
import type { DashboardPanel, DashboardSection } from '@kbn/as-code-dashboard-schema';

export interface DashboardLayoutPanel {
  grid: DashboardPanel['grid'] & { sectionId?: string };
  type: DashboardPanel['type'];
}

export interface DashboardLayout {
  panels: {
    [uuid: string]: DashboardLayoutPanel;
  };
  sections: { [id: string]: Pick<DashboardSection, 'collapsed' | 'grid' | 'title'> };
  pinnedPanels: {
    [id: string]: PinnedPanelLayoutState;
  };
}

export interface DashboardChildState {
  [uuid: string]: object;
}
