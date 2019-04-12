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
import { AppState } from 'ui/state_management/app_state';
import { DashboardAppController } from './dashboard_app_controller';

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'react',
  'kibana/courier',
  'kibana/config',
]);

app.directive('dashboardApp', ($injector: any) => {
  const AppState = $injector.get('AppState');
  const kbnUrl = $injector.get('kbnUrl');
  const confirmModal = $injector.get('confirmModal') as () => void;
  const config = $injector.get('config');
  const Private = $injector.get('Private');
  const indexPatterns = $injector.get('indexPatterns');
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
    appState: AppState
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
      }),
  };
});
