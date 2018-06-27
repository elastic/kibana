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

import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';
import { getUpdateStatus } from 'ui/vis/update_status';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualizationEditor', function (Private, $timeout) {
    const editorTypes = Private(VisEditorTypesRegistryProvider);

    return {
      restrict: 'E',
      scope: {
        savedObj: '=',
        uiState: '=?',
        timeRange: '='
      },
      link: function ($scope, element) {
      // Clone the _vis instance.
        const vis = $scope.savedObj.vis;
        const Editor = typeof vis.type.editor === 'function' ? vis.type.editor :
          editorTypes.find(editor => editor.key === vis.type.editor);
        const editor = new Editor(element[0], vis);

        $scope.renderFunction = () => {
          if (!vis) return;
          editor.render($scope.savedObj, {
            updateStatus: getUpdateStatus(Editor.requiresUpdateStatus, $scope, $scope),
            uiState: $scope.uiState,
            timeRange: $scope.timeRange
          });
        };

        $scope.$on('render', (event) => {
          event.preventDefault();
          $timeout(() => { $scope.renderFunction(); });
        });

        $scope.$on('$destroy', () => {
          editor.destroy();
        });

        $scope.renderFunction();
      }
    };
  });
