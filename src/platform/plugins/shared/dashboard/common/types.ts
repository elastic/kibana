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
import type {
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '@kbn/controls-plugin/common';

import type { DashboardPanelMap } from './dashboard_container/types';
import type {
  DashboardAttributes,
  DashboardOptions,
  DashboardPanel,
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

/**
 * Dashboard state stored in dashboard URLs
 * Do not change type without considering BWC of stored URLs
 */
export type SharedDashboardState = Partial<
  Omit<DashboardState, 'panels'> & {
    controlGroupInput?: DashboardState['controlGroupInput'] & SerializableRecord;

    /**
     * Runtime control group state.
     * @deprecated use controlGroupInput
     */
    controlGroupState?: Partial<ControlGroupRuntimeState> & SerializableRecord;

    panels: DashboardPanel[];

    references?: DashboardState['references'] & SerializableRecord;
  }
>;

export type DashboardLocatorParams = Partial<SharedDashboardState> & {
  /**
   * If given, the dashboard saved object with this id will be loaded. If not given,
   * a new, unsaved dashboard will be loaded up.
   */
  dashboardId?: string;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * When `true` filters from saved filters from destination dashboard as merged with applied filters
   * When `false` applied filters take precedence and override saved filters
   *
   * true is default
   */
  preserveSavedFilters?: boolean;

  /**
   * Search search session ID to restore.
   * (Background search)
   */
  searchSessionId?: string;
};
