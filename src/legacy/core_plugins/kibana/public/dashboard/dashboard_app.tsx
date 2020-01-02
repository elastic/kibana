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

import moment from 'moment';
import { Subscription } from 'rxjs';

import {
  AppStateClass as TAppStateClass,
  AppState as TAppState,
  IInjector,
  KbnUrl,
} from './legacy_imports';

import { ViewMode } from '../../../embeddable_api/public/np_ready/public';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';
import { DashboardAppState, SavedDashboardPanel, ConfirmModalFn } from './types';
import {
  IIndexPattern,
  TimeRange,
  Query,
  esFilters,
  SavedQuery,
} from '../../../../../../src/plugins/data/public';

import { DashboardAppController } from './dashboard_app_controller';
import { RenderDeps } from './application';

export interface DashboardAppScope extends ng.IScope {
  dash: SavedObjectDashboard;
  appState: TAppState;
  screenTitle: string;
  model: {
    query: Query;
    filters: esFilters.Filter[];
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
  panels: SavedDashboardPanel[];
  indexPatterns: IIndexPattern[];
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
  onFiltersUpdated: (filters: esFilters.Filter[]) => void;
  onCancelApplyFilters: () => void;
  onApplyFilters: (filters: esFilters.Filter[]) => void;
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

export function initDashboardAppDirective(app: any, deps: RenderDeps) {
  app.directive('dashboardApp', function($injector: IInjector) {
    const AppState = $injector.get<TAppStateClass<DashboardAppState>>('AppState');
    const kbnUrl = $injector.get<KbnUrl>('kbnUrl');
    const confirmModal = $injector.get<ConfirmModalFn>('confirmModal');
    const config = deps.uiSettings;

    return {
      restrict: 'E',
      controllerAs: 'dashboardApp',
      controller: (
        $scope: DashboardAppScope,
        $route: any,
        $routeParams: {
          id?: string;
        },
        getAppState: any,
        globalState: any
      ) =>
        new DashboardAppController({
          $route,
          $scope,
          $routeParams,
          getAppState,
          globalState,
          kbnUrl,
          AppStateClass: AppState,
          config,
          confirmModal,
          indexPatterns: deps.npDataStart.indexPatterns,
          ...deps,
        }),
    };
  });
}
