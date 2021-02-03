/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export function Chart(timelionPanels) {
  return {
    restrict: 'A',
    scope: {
      seriesList: '=chart', // The flot object, data, config and all
      search: '=', // The function to execute to kick off a search
      interval: '=', // Required for formatting x-axis ticks
      rerenderTrigger: '=',
    },
    link: function ($scope, $elem) {
      let panelScope = $scope.$new(true);

      function render() {
        panelScope.$destroy();

        if (!$scope.seriesList) return;

        $scope.seriesList.render = $scope.seriesList.render || {
          type: 'timechart',
        };

        const panelSchema = timelionPanels.get($scope.seriesList.render.type);

        if (!panelSchema) {
          $elem.text(
            i18n.translate('timelion.chart.seriesList.noSchemaWarning', {
              defaultMessage: 'No such panel type: {renderType}',
              values: { renderType: $scope.seriesList.render.type },
            })
          );
          return;
        }

        panelScope = $scope.$new(true);
        panelScope.seriesList = $scope.seriesList;
        panelScope.interval = $scope.interval;
        panelScope.search = $scope.search;

        panelSchema.render(panelScope, $elem);
      }

      $scope.$watchGroup(['seriesList', 'rerenderTrigger'], render);
    },
  };
}
