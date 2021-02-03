/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getAngularModule, getServices } from '../../kibana_services';
// @ts-ignore
import { getRootBreadcrumbs } from '../helpers/breadcrumbs';
import html from './doc.html';
import { Doc } from '../components/doc/doc';

interface LazyScope extends ng.IScope {
  [key: string]: any;
}

const { timefilter } = getServices();
const app = getAngularModule();
app.directive('discoverDoc', function (reactDirective: any) {
  return reactDirective(
    Doc,
    [
      ['id', { watchDepth: 'value' }],
      ['index', { watchDepth: 'value' }],
      ['indexPatternId', { watchDepth: 'reference' }],
      ['indexPatternService', { watchDepth: 'reference' }],
    ],
    { restrict: 'E' }
  );
});

app.config(($routeProvider: any) => {
  $routeProvider
    .when('/doc/:indexPattern/:index/:type', {
      redirectTo: '/doc/:indexPattern/:index',
    })
    // the new route, es 7 deprecated types, es 8 removed them
    .when('/doc/:indexPattern/:index', {
      // have to be written as function expression, because it's not compiled in dev mode
      // eslint-disable-next-line object-shorthand
      controller: function ($scope: LazyScope, $route: any) {
        timefilter.disableAutoRefreshSelector();
        timefilter.disableTimeRangeSelector();
        $scope.id = $route.current.params.id;
        $scope.index = $route.current.params.index;
        $scope.indexPatternId = $route.current.params.indexPattern;
        $scope.indexPatternService = getServices().indexPatterns;
      },
      template: html,
      k7Breadcrumbs: ($route: any) => [
        ...getRootBreadcrumbs(),
        {
          text: `${$route.current.params.index}#${$route.current.params.id}`,
        },
      ],
    });
});
