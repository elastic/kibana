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
import uiRoutes from 'ui/routes';
// @ts-ignore
import { getRootBreadcrumbs } from 'plugins/kibana/discover/breadcrumbs';
// @ts-ignore
import html from './index.html';
import './doc_directive';
import { IndexPatterns } from '../../../data/public/index_patterns';

uiRoutes
  // the old, pre 8.0 route, no longer used, keep it to stay compatible
  // somebody might have bookmarked his favorite log messages
  .when('/doc/:indexPattern/:index/:type', {
    redirectTo: '/doc/:indexPattern/:index',
  })
  // the new route, es 7 deprecated types, es 8 removed them
  .when('/doc/:indexPattern/:index', {
    controller: ($scope: any, $route: any, es: any) => {
      $scope.esClient = es;
      $scope.id = $route.current.params.id;
      $scope.index = $route.current.params.index;
      $scope.indexPattern = $route.current.locals.indexPattern;
    },
    template: html,
    resolve: {
      indexPattern: (indexPatterns: IndexPatterns, savedSearches: any, $route: any) => {
        return indexPatterns.get($route.current.params.indexPattern);
      },
    },
    k7Breadcrumbs: ($route: any) => [
      ...getRootBreadcrumbs(),
      {
        text: `${$route.current.params.index}#${$route.current.params.id}`,
      },
    ],
  });
