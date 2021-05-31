/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getAngularModule, getServices } from '../../kibana_services';
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
  $routeProvider.when('/context/:indexPatternId/:id*', {
    controller: ContextAppRouteController,
    k7Breadcrumbs,
    controllerAs: 'contextAppRoute',
    resolve: {
      indexPattern: ($route, Promise) => {
        const indexPattern = getServices().indexPatterns.get($route.current.params.indexPatternId);
        return Promise.props({ ip: indexPattern });
      },
    },
    template: contextAppRouteTemplate,
  });
});

function ContextAppRouteController($routeParams, $scope, $route) {
  this.indexPattern = $route.current.locals.indexPattern.ip;
  this.anchorId = $routeParams.id;
  this.indexPatternId = $route.current.params.indexPatternId;
}
