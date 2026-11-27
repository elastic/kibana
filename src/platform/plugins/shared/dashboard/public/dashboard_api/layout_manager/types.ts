/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// controls are currently the only pinnable panels, so that is why this type exists in `controls-schemas` for now
import type { ControlWidth as PinnedPanelWidth } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { DashboardPanel } from '@kbn/as-code-dashboard-schema';
import type {
  DashboardChildState,
  DashboardLayout,
  DashboardLayoutPanel,
} from '../../../common/dashboard_state/layout/layout_types';

export type { DashboardChildState, DashboardLayout, DashboardLayoutPanel };

export interface DashboardChildren {
  [uuid: string]: DefaultEmbeddableApi;
}

export const isDashboardLayoutPanel = (panel: unknown): panel is DashboardLayoutPanel =>
  Boolean((panel as DashboardLayoutPanel).type) && Boolean((panel as DashboardLayoutPanel).grid);

export interface DashboardPinnablePanel {
  type: DashboardPanel['type'];
  grow?: boolean;
  width?: PinnedPanelWidth;
  order?: number;
}
