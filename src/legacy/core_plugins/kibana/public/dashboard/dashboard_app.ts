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
// @ts-ignore
import { uiModules } from 'ui/modules';

// @ts-ignore
import * as filterActions from 'plugins/kibana/discover/doc_table/actions/filter';

// @ts-ignore
import { FilterManagerProvider } from 'ui/filter_manager';
import { AppState as TAppState, IAppState } from 'ui/state_management/app_state';
import { IInjector } from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { KbnUrl } from 'ui/url/kbn_url';
import { IndexPattern } from 'ui/index_patterns';
import { DashboardAppController } from './dashboard_app_controller';
import { DashboardAppState } from './types';

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'react',
  'kibana/courier',
  'kibana/config',
]);

app.directive('dashboardApp', ($injector: IInjector) => {
  const AppState = $injector.get<IAppState<DashboardAppState>>('AppState');
  const kbnUrl = $injector.get<KbnUrl>('kbnUrl');
  const confirmModal = $injector.get<() => void>('confirmModal');
  const config = $injector.get('config');
  const courier = $injector.get<{ fetch: () => void }>('courier');

  const Private = $injector.get<IPrivate>('Private');
  const indexPatterns = $injector.get<{
    getDefault: () => Promise<IndexPattern>;
  }>('indexPatterns');
  const filterManager = Private(FilterManagerProvider);

  const addFilter = (
    {
      field,
      value,
      operator,
      index,
    }: {
      field: string;
      value: string;
      operator: string;
      index: string;
    },
    appState: TAppState
  ) => {
    filterActions.addFilter(field, value, operator, index, appState, filterManager);
  };

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: (
      $scope: any,
      $route: any,
      $routeParams: any,
      getAppState: any,
      dashboardConfig: any,
      localStorage: any
    ) =>
      new DashboardAppController({
        $route,
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
