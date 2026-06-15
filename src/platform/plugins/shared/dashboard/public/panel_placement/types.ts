/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardLayout, DashboardLayoutPanel } from '../dashboard_api/layout_manager';

export type PanelPlacementReturn = DashboardLayout;

export interface PanelPlacementProps {
  panel: Pick<DashboardLayoutPanel, 'type'> & {
    uuid: string;
    grid: Pick<DashboardLayoutPanel['grid'], 'sectionId' | 'w' | 'h'>;
  };
  currentLayout: DashboardLayout;
  beside?: string; // the ID of the panel to place the new panel relative to
}
