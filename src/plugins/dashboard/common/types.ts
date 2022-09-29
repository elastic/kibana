/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedDashboardPanel } from './dashboard_saved_object/types';
import { DashboardContainerByValueInput } from './dashboard_container/types';

export interface DashboardOptions {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
  syncTooltips: boolean;
}

export interface DashboardCapabilities {
  showWriteControls: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * For BWC reasons, dashboard state is stored with panels as an array instead of a map
 */
export type SharedDashboardState = Partial<
  Omit<DashboardContainerByValueInput, 'panels'> & { panels: SavedDashboardPanel[] }
>;

/**
 * Grid type for React Grid Layout
 */
export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}
