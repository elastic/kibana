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

import './color.less';
import colorTemplate from './color.html';
import { DEFAULT_COLOR } from '../../../../../core_plugins/kibana/common/field_formats/types/color_default';

export function colorEditor() {
  return {
    formatId: 'color',
    template: colorTemplate,
    controller($scope) {
      $scope.$watch('editor.field.type', (type) => {
        $scope.editor.formatParams.fieldType = type;
      });

      $scope.addColor = function () {
        $scope.editor.formatParams.colors.push({ ...DEFAULT_COLOR });
      };

      $scope.removeColor = function (index) {
        $scope.editor.formatParams.colors.splice(index, 1);
      };

      $scope.setColor = function (index, propName, value) {
        $scope.editor.formatParams.colors[index][propName] = value;
      };

      // EuiColorPicker onChange prop expects a function taking a single parameter: 'value'
      // Updating color in $scope requires other parameters (like colors index).
      // Use bind to create a function to pass to react.
      // Must use a single bind and then store the function so react does not infinitely re-render.
      $scope.getSetBackgroundColor = function (index) {
        if ($scope.editor.formatParams.colors[index].setBackgroundColor) {
          return $scope.editor.formatParams.colors[index].setBackgroundColor;
        }

        $scope.editor.formatParams.colors[index].setBackgroundColor = $scope.setColor.bind(null, index, 'background');
        return $scope.editor.formatParams.colors[index].setBackgroundColor;
      };
      $scope.getSetTextColor = function (index) {
        if ($scope.editor.formatParams.colors[index].setTextColor) {
          return $scope.editor.formatParams.colors[index].setTextColor;
        }

        $scope.editor.formatParams.colors[index].setTextColor = $scope.setColor.bind(null, index, 'text');
        return $scope.editor.formatParams.colors[index].setTextColor;
      };
    }
  };
}
