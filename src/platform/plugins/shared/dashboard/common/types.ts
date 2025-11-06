/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardState } from '../server';

export type { DashboardState };

export interface DashboardCapabilities {
  showWriteControls: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

export type DashboardLocatorParams = Partial<
  DashboardState & {
    controlGroupInput?: DashboardState['controlGroupInput'] & SerializableRecord;

    references?: DashboardState['references'] & SerializableRecord;

    viewMode?: ViewMode;

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

    /**
     * Set to pass state from solution to embeddables.
     * See PassThroughContext presentation container interface for details
     */
    passThroughContext?: SerializableRecord;
  }
>;
