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
import panelRegistryProvider from '../../lib/panel_registry';

require('ui/modules')
  .get('apps/timelion', [])
  .directive('chart', function (Private, i18n) {
    return {
      restrict: 'A',
      scope: {
        seriesList: '=chart', // The flot object, data, config and all
        search: '=', // The function to execute to kick off a search
        interval: '=', // Required for formatting x-axis ticks
        rerenderTrigger: '=',
      },
      link: function ($scope, $elem) {

        const panelRegistry = Private(panelRegistryProvider);
        let panelScope = $scope.$new(true);

        function render() {
          panelScope.$destroy();

          if (!$scope.seriesList) return;

          $scope.seriesList.render = $scope.seriesList.render || {
            type: 'timechart'
          };

          const panelSchema = panelRegistry.byName[$scope.seriesList.render.type];

          if (!panelSchema) {
            $elem.text(
              i18n('timelion.chart.seriesList.noSchemaWarning', {
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
      }
    };
  });
