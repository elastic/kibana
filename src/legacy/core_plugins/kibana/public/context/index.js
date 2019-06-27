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

import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import uiRoutes from 'ui/routes';
import { i18n } from '@kbn/i18n';

import './app';
import contextAppRouteTemplate from './index.html';
import { getRootBreadcrumbs } from '../discover/breadcrumbs';
import { npStart } from 'ui/new_platform';

uiRoutes
  .when('/context/:indexPatternId/:type/:id*', {
    controller: ContextAppRouteController,
    k7Breadcrumbs($route) {
      const { indexPattern } = $route.current.locals;
      const { id } = $route.current.params;

      return [
        ...getRootBreadcrumbs(),
        {
          text: i18n.translate('kbn.context.breadcrumb', {
            defaultMessage: 'Context of {indexPatternTitle}#{docId}',
            values: {
              indexPatternTitle: indexPattern.title,
              docId: id
            }
          })
        }
      ];
    },
    controllerAs: 'contextAppRoute',
    resolve: {
      indexPattern: function ($route, indexPatterns) {
        return indexPatterns.get($route.current.params.indexPatternId);
      },
    },
    template: contextAppRouteTemplate,
  });


function ContextAppRouteController(
  $routeParams,
  $scope,
  AppState,
  config,
  indexPattern,
  Private,
) {
  const queryFilter = Private(FilterBarQueryFilterProvider);

  this.state = new AppState(createDefaultAppState(config, indexPattern));
  this.state.save(true);

  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.predecessorCount',
    'contextAppRoute.state.successorCount',
  ], () => this.state.save(true));

  const updateSubsciption = queryFilter.getUpdates$().subscribe({
    next: () => {
      this.filters = _.cloneDeep(queryFilter.getFilters());
    }
  });

  $scope.$on('$destroy', function () {
    updateSubsciption.unsubscribe();
  });

  this.anchorType = $routeParams.type;
  this.anchorId = $routeParams.id;
  this.indexPattern = indexPattern;
  this.discoverUrl = npStart.core.chrome.navLinks.get('kibana:discover').url;
  this.filters = _.cloneDeep(queryFilter.getFilters());
}

function createDefaultAppState(config, indexPattern) {
  return {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(config.get('context:defaultSize'), 10),
    sort: [indexPattern.timeFieldName, 'desc'],
    successorCount: parseInt(config.get('context:defaultSize'), 10),
  };
}
