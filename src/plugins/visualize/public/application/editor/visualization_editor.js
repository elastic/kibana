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

export function initVisEditorDirective(app, deps) {
  app.directive('visualizationEditor', function($timeout) {
    return {
      restrict: 'E',
      scope: {
        vis: '=',
        uiState: '=?',
        timeRange: '=',
        filters: '=',
        query: '=',
        savedSearch: '=',
        embeddableHandler: '=',
        eventEmitter: '=',
      },
      link: function($scope, element) {
        const Editor = $scope.vis.type.editor || deps.DefaultVisualizationEditor;
        const editor = new Editor(
          element[0],
          $scope.vis,
          $scope.eventEmitter,
          $scope.embeddableHandler
        );

        $scope.renderFunction = () => {
          editor.render({
            core: deps.core,
            data: deps.data,
            uiState: $scope.uiState,
            timeRange: $scope.timeRange,
            filters: $scope.filters,
            query: $scope.query,
            linked: !!$scope.vis.data.savedSearchId,
            savedSearch: $scope.savedSearch,
          });
        };

        $scope.$on('render', event => {
          event.preventDefault();
          $timeout(() => {
            $scope.renderFunction();
          });
        });

        $scope.$on('$destroy', () => {
          editor.destroy();
        });
      },
    };
  });
}
