/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SerializableRecord, Writable } from '@kbn/utility-types';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { ControlGroupSerializedState } from '@kbn/controls-plugin/common';

import type { DashboardPanelMap, DashboardSectionMap } from './dashboard_container/types';
import type {
  DashboardAttributes,
  DashboardOptions,
  DashboardPanel,
  DashboardSection,
} from '../server/content_management';

export interface DashboardCapabilities {
  showWriteControls: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export interface ParsedDashboardAttributesWithType {
  id: string;
  panels: DashboardPanelMap;
  sections: DashboardSectionMap;
  type: 'dashboard';
}

export interface DashboardAttributesAndReferences {
  attributes: DashboardAttributes;
  references: Reference[];
}

export type DashboardSettings = Writable<DashboardOptions> & {
  description?: DashboardAttributes['description'];
  tags: string[];
  timeRestore: DashboardAttributes['timeRestore'];
  title: DashboardAttributes['description'];
};

export interface DashboardState extends DashboardSettings {
  query: Query;
  filters: Filter[];
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
  viewMode: ViewMode;
  panels: DashboardPanelMap;
  sections: DashboardSectionMap;

  /**
   * Temporary. Currently Dashboards are in charge of providing references to all of their children.
   * Eventually this will be removed in favour of the Dashboard injecting references serverside.
   */
  references?: Reference[];

  /**
   * Serialized control group state.
   * Contains state loaded from dashboard saved object
   */
  controlGroupInput?: ControlGroupSerializedState;
}

export type DashboardLocatorParams = Partial<
  Omit<DashboardState, 'panels' | 'sections'> & {
    controlGroupInput?: DashboardState['controlGroupInput'] & SerializableRecord;

    panels: Array<DashboardPanel | DashboardSection>;

    references?: DashboardState['references'] & SerializableRecord;

    /**
     * If provided, the dashboard with this id will be loaded. If not given, new, unsaved dashboard will be loaded.
     */
    dashboardId?: string;

    /**
     * Determines whether to hash the contents of the url to avoid url length issues. Defaults to the uiSettings configuration for `storeInSessionStorage`.
     */
    useHash?: boolean;

    /**
     * Denotes whether to merge provided filters from the locator state with the filters saved into the Dashboard.
     * When false, the saved filters will be overwritten. Defaults to true.
     */
    preserveSavedFilters?: boolean;

    /**
     * Search search session ID to restore.
     * (Background search)
     */
    searchSessionId?: string;
  }
>;
