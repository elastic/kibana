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

import { debounce } from 'lodash';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';

uiModules
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualizationEditor', function(Private, $timeout, getAppState) {
    const editorTypes = Private(VisEditorTypesRegistryProvider);

    return {
      restrict: 'E',
      scope: {
        savedObj: '=',
        uiState: '=?',
        timeRange: '=',
        filters: '=',
      },
      link: function($scope, element) {
        const editorType = $scope.savedObj.vis.type.editor;
        const Editor =
          typeof editorType === 'function'
            ? editorType
            : editorTypes.find(editor => editor.key === editorType);
        const editor = new Editor(element[0], $scope.savedObj);

        $scope.renderFunction = () => {
          editor.render({
            uiState: $scope.uiState,
            timeRange: $scope.timeRange,
            filters: $scope.filters,
            appState: getAppState(),
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

        $scope.$watchGroup(
          ['timeRange', 'filters'],
          debounce(() => {
            $scope.renderFunction();
          }, 100)
        );
      },
    };
  });
