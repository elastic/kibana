/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlWidth, StickyControlLayoutState } from '@kbn/controls-schemas/src/types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { SerializedPanelState } from '@kbn/presentation-publishing';
import type { DashboardPanel, DashboardSection } from '../../../server';

export interface DashboardChildren {
  [uuid: string]: DefaultEmbeddableApi;
}

export interface DashboardLayoutPanel {
  grid: DashboardPanel['grid'] & { sectionId?: string };
  type: DashboardPanel['type'];
}

export const isDashboardLayoutPanel = (panel: unknown): panel is DashboardLayoutPanel =>
  Boolean((panel as DashboardLayoutPanel).type) && Boolean((panel as DashboardLayoutPanel).grid);

export interface DashboardPinnableControl {
  type: DashboardPanel['type'];
  grow?: boolean;
  width?: ControlWidth;
  order?: number;
}

export interface DashboardLayout {
  panels: {
    [uuid: string]: DashboardLayoutPanel;
  };
  sections: { [id: string]: Pick<DashboardSection, 'collapsed' | 'grid' | 'title'> };
  controls: {
    [id: string]: StickyControlLayoutState;
  };
}

export interface DashboardChildState {
  [uuid: string]: SerializedPanelState<object>;
}
