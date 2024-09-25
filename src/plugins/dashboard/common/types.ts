/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { DashboardAttributes, SavedDashboardPanel } from './content_management';
import { DashboardContainerInput, DashboardPanelMap } from './dashboard_container/types';

export interface DashboardOptions {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
  syncTooltips: boolean;
  syncCursor: boolean;
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
  Omit<DashboardContainerInput, 'panels'> & { panels: SavedDashboardPanel[] }
>;

/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export type ParsedDashboardAttributesWithType = EmbeddableStateWithType & {
  panels: DashboardPanelMap;
  type: 'dashboard';
};

export interface DashboardAttributesAndReferences {
  attributes: DashboardAttributes;
  references: Reference[];
}
