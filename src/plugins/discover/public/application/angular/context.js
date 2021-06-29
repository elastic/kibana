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

const k7Breadcrumbs = () => {
  return [
    ...getRootBreadcrumbs(),
    {
      text: i18n.translate('discover.context.breadcrumb', {
        defaultMessage: 'Surrounding documents',
      }),
    },
  ];
};

getAngularModule().config(($routeProvider) => {
  $routeProvider.when('/context/:indexPatternId/:id*', {
    controller: function ($routeParams, $scope, $route) {
      this.indexPattern = $route.current.locals.indexPattern.ip;
      this.anchorId = $routeParams.id;
      this.indexPatternId = $route.current.params.indexPatternId;
    },
    k7Breadcrumbs,
    controllerAs: 'contextAppRoute',
    reloadOnSearch: false,
    resolve: {
      indexPattern: ($route, Promise) => {
        const indexPattern = getServices().indexPatterns.get($route.current.params.indexPatternId);
        return Promise.props({ ip: indexPattern });
      },
    },
    template: contextAppRouteTemplate,
  });
});
