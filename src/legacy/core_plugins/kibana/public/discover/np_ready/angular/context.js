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
import { getAngularModule, getServices, subscribeWithScope } from '../../kibana_services';

import './context_app';
import { getAppState } from './context_state';
import contextAppRouteTemplate from './context.html';
import { getRootBreadcrumbs } from '../helpers/breadcrumbs';
import { FilterStateManager } from '../../../../../data/public';
const { chrome } = getServices();

const k7Breadcrumbs = $route => {
  const { indexPattern } = $route.current.locals;
  const { id } = $route.current.params;

  return [
    ...getRootBreadcrumbs(),
    {
      text: i18n.translate('kbn.context.breadcrumb', {
        defaultMessage: 'Context of {indexPatternTitle}#{docId}',
        values: {
          indexPatternTitle: indexPattern.title,
          docId: id,
        },
      }),
    },
  ];
};

getAngularModule().config($routeProvider => {
  $routeProvider
    // deprecated route, kept for compatibility
    // should be removed in the future
    .when('/discover/context/:indexPatternId/:type/:id*', {
      redirectTo: '/discover/context/:indexPatternId/:id',
    })
    .when('/discover/context/:indexPatternId/:id*', {
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

function ContextAppRouteController($routeParams, $scope, config, $route, globalState) {
  const filterManager = getServices().filterManager;
  const indexPattern = $route.current.locals.indexPattern.ip;
  const { start, stateContainer, initialState } = getAppState(
    config.get('context:defaultSize'),
    indexPattern.timeFieldName
  );
  this.state = _.cloneDeep(initialState);
  const filterStateManager = new FilterStateManager(globalState, () => ({}), filterManager);

  start();
  stateContainer.subscribe(state => {
    this.state = { ...this.state, ...state };
  });

  $scope.$watchGroup(
    [
      'contextAppRoute.state.columns',
      'contextAppRoute.state.predecessorCount',
      'contextAppRoute.state.successorCount',
    ],
    res => {
      stateContainer.set({ columns: res[0], predecessorCount: res[1], successorCount: res[2] });
    }
  );

  const updateSubsciption = subscribeWithScope($scope, filterManager.getUpdates$(), {
    next: () => {
      this.filters = _.cloneDeep(filterManager.getFilters());
    },
  });

  $scope.$on('$destroy', () => {
    filterStateManager.destroy();
    updateSubsciption.unsubscribe();
    //stop();
  });
  this.anchorId = $routeParams.id;
  this.indexPattern = indexPattern;
  this.discoverUrl = chrome.navLinks.get('kibana:discover').url;
  this.filters = _.cloneDeep(filterManager.getFilters());
}
