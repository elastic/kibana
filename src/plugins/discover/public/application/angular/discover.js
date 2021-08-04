/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAngularModule, getServices } from '../../kibana_services';

const services = getServices();

const { history: getHistory } = getServices();

const app = getAngularModule();

app.directive('discoverApp', function () {
  return {
    restrict: 'E',
    controllerAs: 'discoverApp',
    controller: discoverController,
  };
});

function discoverController(_, $scope) {
  const history = getHistory();

  $scope.opts = {
    history,
    services,
    navigateTo: (path) => {
      $scope.$evalAsync(() => {
        history.push(path);
      });
    },
  };

  $scope.$on('$destroy', () => {});
}
