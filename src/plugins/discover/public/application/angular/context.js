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
import { i18n } from '@kbn/i18n';
import { CONTEXT_DEFAULT_SIZE_SETTING } from '../../../common';
import { getAngularModule, getServices } from '../../kibana_services';
import './context_app';
import { getState } from './context_state';
import contextAppRouteTemplate from './context.html';
import { getRootBreadcrumbs } from '../helpers/breadcrumbs';

const k7Breadcrumbs = ($route) => {
  const { indexPattern } = $route.current.locals;
  const { id } = $route.current.params;

  return [
    ...getRootBreadcrumbs(),
    {
      text: i18n.translate('discover.context.breadcrumb', {
        defaultMessage: 'Context of {indexPatternTitle}#{docId}',
        values: {
          indexPatternTitle: indexPattern.title,
          docId: id,
        },
      }),
    },
  ];
};

getAngularModule().config(($routeProvider) => {
  $routeProvider
    // deprecated route, kept for compatibility
    // should be removed in the future
    .when('/context/:indexPatternId/:type/:id*', {
      redirectTo: '/context/:indexPatternId/:id',
    })
    .when('/context/:indexPatternId/:id*', {
      controller: ContextAppRouteController,
      k7Breadcrumbs,
      controllerAs: 'contextAppRoute',
      resolve: {
        indexPattern: ($route, Promise) => {
          const indexPattern = getServices().indexPatterns.get(
            $route.current.params.indexPatternId
          );
          return Promise.props({ ip: indexPattern });
        },
      },
      template: contextAppRouteTemplate,
    });
});

function ContextAppRouteController($routeParams, $scope, $route) {
  const filterManager = getServices().filterManager;
  const indexPattern = $route.current.locals.indexPattern.ip;
  const {
    startSync: startStateSync,
    stopSync: stopStateSync,
    appState,
    getFilters,
    setFilters,
    setAppState,
    flushToUrl,
  } = getState({
    defaultStepSize: getServices().uiSettings.get(CONTEXT_DEFAULT_SIZE_SETTING),
    timeFieldName: indexPattern.timeFieldName,
    storeInSessionStorage: getServices().uiSettings.get('state:storeInSessionStorage'),
    history: getServices().history(),
  });
  this.state = { ...appState.getState() };
  this.anchorId = $routeParams.id;
  this.indexPattern = indexPattern;
  filterManager.setFilters(_.cloneDeep(getFilters()));
  startStateSync();

  // take care of parameter changes in UI
  $scope.$watchGroup(
    [
      'contextAppRoute.state.columns',
      'contextAppRoute.state.predecessorCount',
      'contextAppRoute.state.successorCount',
    ],
    (newValues) => {
      const [columns, predecessorCount, successorCount] = newValues;
      if (Array.isArray(columns) && predecessorCount >= 0 && successorCount >= 0) {
        setAppState({ columns, predecessorCount, successorCount });
        flushToUrl(true);
      }
    }
  );
  // take care of parameter filter changes
  const filterObservable = filterManager.getUpdates$().subscribe(() => {
    setFilters(filterManager);
    $route.reload();
  });

  $scope.$on('$destroy', () => {
    stopStateSync();
    filterObservable.unsubscribe();
  });
}
