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

export function initVisualizationDirective(app) {
  app.directive('visualizationEmbedded', function ($timeout) {
    return {
      restrict: 'E',
      scope: {
        embeddableHandler: '=',
        uiState: '=?',
        timeRange: '=',
        filters: '=',
        query: '=',
        appState: '=',
      },
      link: function ($scope, element) {
        $scope.renderFunction = async () => {
          if (!$scope.rendered) {
            $scope.embeddableHandler.render(element[0]);
            $scope.rendered = true;
          }

          $scope.embeddableHandler.updateInput({
            timeRange: $scope.timeRange,
            filters: $scope.filters || [],
            query: $scope.query,
          });
        };

        $scope.$on('render', (event) => {
          event.preventDefault();
          $timeout(() => {
            $scope.renderFunction();
          });
        });

        $scope.$on('$destroy', () => {
          if ($scope.embeddableHandler) {
            $scope.embeddableHandler.destroy();
          }
        });
      },
    };
  });
}
