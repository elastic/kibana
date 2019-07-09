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

import _ from 'lodash';

// @ts-ignore
import { uiModules } from 'ui/modules';
import { IInjector } from 'ui/chrome';
import { wrapInI18nContext } from 'ui/i18n';

// @ts-ignore
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';

// @ts-ignore
import { docTitle } from 'ui/doc_title';

// @ts-ignore
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';

// @ts-ignore
import * as filterActions from 'plugins/kibana/discover/doc_table/actions/filter';

// @ts-ignore
import { getFilterGenerator } from 'ui/filter_manager';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { EmbeddableFactory } from 'ui/embeddable';

import {
  AppStateClass as TAppStateClass,
  AppState as TAppState,
} from 'ui/state_management/app_state';

import { KbnUrl } from 'ui/url/kbn_url';
import { Filter } from '@kbn/es-query';
import { TimeRange } from 'ui/timefilter/time_history';
import { IndexPattern } from 'ui/index_patterns';
import { IPrivate } from 'ui/private';
import { StaticIndexPattern, Query } from 'src/legacy/core_plugins/data/public';
import moment from 'moment';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';
import { DashboardAppState, SavedDashboardPanel, ConfirmModalFn, AddFilterFn } from './types';

// @ts-ignore -- going away soon
import { DashboardViewportProvider } from './viewport/dashboard_viewport_provider';

import { DashboardStateManager } from './dashboard_state_manager';
import { DashboardViewMode } from './dashboard_view_mode';
import { DashboardAppController } from './dashboard_app_controller';

export interface DashboardAppScope extends ng.IScope {
  dash: SavedObjectDashboard;
  appState: TAppState;
  screenTitle: string;
  model: {
    query: Query | string;
    filters: Filter[];
    timeRestore: boolean;
    title: string;
    description: string;
    timeRange:
      | TimeRange
      | { to: string | moment.Moment | undefined; from: string | moment.Moment | undefined };
    refreshInterval: any;
  };
  refreshInterval: any;
  panels: SavedDashboardPanel[];
  indexPatterns: StaticIndexPattern[];
  $evalAsync: any;
  dashboardViewMode: DashboardViewMode;
  expandedPanel?: string;
  getShouldShowEditHelp: () => boolean;
  getShouldShowViewHelp: () => boolean;
  updateQueryAndFetch: ({ query, dateRange }: { query: Query; dateRange?: TimeRange }) => void;
  onRefreshChange: (
    { isPaused, refreshInterval }: { isPaused: boolean; refreshInterval: any }
  ) => void;
  onFiltersUpdated: (filters: Filter[]) => void;
  $listenAndDigestAsync: any;
  onCancelApplyFilters: () => void;
  onApplyFilters: (filters: Filter[]) => void;
  topNavMenu: any;
  showFilterBar: () => boolean;
  showAddPanel: any;
  kbnTopNav: any;
  enterEditMode: () => void;
  $listen: any;
  getEmbeddableFactory: (type: string) => EmbeddableFactory;
  getDashboardState: () => DashboardStateManager;
  refresh: () => void;
}

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'react',
  'kibana/courier',
  'kibana/config',
]);

app.directive('dashboardViewportProvider', function(reactDirective: any) {
  return reactDirective(wrapInI18nContext(DashboardViewportProvider));
});

app.directive('dashboardApp', function($injector: IInjector) {
  const AppState = $injector.get<TAppStateClass<DashboardAppState>>('AppState');
  const kbnUrl = $injector.get<KbnUrl>('kbnUrl');
  const confirmModal = $injector.get<ConfirmModalFn>('confirmModal');
  const config = $injector.get('config');
  const courier = $injector.get<{ fetch: () => void }>('courier');

  const Private = $injector.get<IPrivate>('Private');

  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterGen = getFilterGenerator(queryFilter);
  const addFilter: AddFilterFn = ({ field, value, operator, index }, appState: TAppState) => {
    filterActions.addFilter(field, value, operator, index, appState, filterGen);
  };

  const indexPatterns = $injector.get<{
    getDefault: () => Promise<IndexPattern>;
  }>('indexPatterns');

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: (
      $scope: DashboardAppScope,
      $rootScope: ng.IRootScopeService,
      $route: any,
      $routeParams: {
        id?: string;
      },
      getAppState: {
        previouslyStored: () => TAppState | undefined;
      },
      dashboardConfig: {
        getHideWriteControls: () => boolean;
      },
      localStorage: WindowLocalStorage
    ) =>
      new DashboardAppController({
        $route,
        $rootScope,
        $scope,
        $routeParams,
        getAppState,
        dashboardConfig,
        localStorage,
        Private,
        kbnUrl,
        AppStateClass: AppState,
        indexPatterns,
        config,
        confirmModal,
        addFilter,
        courier,
      }),
  };
});
