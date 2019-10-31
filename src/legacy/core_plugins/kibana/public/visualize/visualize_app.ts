/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  AppStateClass as TAppStateClass,
  AppState as TAppState,
} from 'ui/state_management/app_state';

import { KbnUrl } from 'ui/url/kbn_url';
import { Filter } from '@kbn/es-query';
import { TimeRange } from 'src/plugins/data/public';
import { StaticIndexPattern, Query, SavedQuery } from 'plugins/data';
import moment from 'moment';
import { Subscription } from 'rxjs';

import { ViewMode } from '../../../embeddable_api/public/np_ready/public';
import { SavedVisualizations } from './types';

// @ts-ignore
import { VisualizeAppController } from './editor/editor';
import { RenderDeps } from './render_app';

// @ts-ignore
import { initEditorDirective } from './editor/editor';
// @ts-ignore
import { initListingDirective } from './listing/visualize_listing';

export interface VisualizeAppScope extends ng.IScope {
  // dash: SavedObjectDashboard;
  appState: TAppState;
  screenTitle: string;
  model: {
    query: Query;
    filters: Filter[];
    timeRestore: boolean;
    title: string;
    description: string;
    timeRange:
      | TimeRange
      | { to: string | moment.Moment | undefined; from: string | moment.Moment | undefined };
    refreshInterval: any;
  };
  savedQuery?: SavedQuery;
  refreshInterval: any;
  panels: SavedVisualizations[];
  indexPatterns: StaticIndexPattern[];
  $evalAsync: any;
  dashboardViewMode: ViewMode;
  expandedPanel?: string;
  getShouldShowEditHelp: () => boolean;
  getShouldShowViewHelp: () => boolean;
  updateQueryAndFetch: ({ query, dateRange }: { query: Query; dateRange?: TimeRange }) => void;
  onRefreshChange: ({
    isPaused,
    refreshInterval,
  }: {
    isPaused: boolean;
    refreshInterval: any;
  }) => void;
  onFiltersUpdated: (filters: Filter[]) => void;
  onCancelApplyFilters: () => void;
  onApplyFilters: (filters: Filter[]) => void;
  onQuerySaved: (savedQuery: SavedQuery) => void;
  onSavedQueryUpdated: (savedQuery: SavedQuery) => void;
  onClearSavedQuery: () => void;
  topNavMenu: any;
  showFilterBar: () => boolean;
  showAddPanel: any;
  showSaveQuery: boolean;
  kbnTopNav: any;
  enterEditMode: () => void;
  timefilterSubscriptions$: Subscription;
  isVisible: boolean;
}

export function initVisualizeAppDirective(app: any, deps: RenderDeps) {
  initEditorDirective(app, deps);
  initListingDirective(app, deps);
}
