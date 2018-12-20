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
import gaugeOptionsTemplate from './gauge_options.html';
import _ from 'lodash';
const module = uiModules.get('kibana');

module.directive('gaugeOptions', function (i18n) {
  return {
    restrict: 'E',
    template: gaugeOptionsTemplate,
    replace: true,
    link: function ($scope) {
      $scope.collections = $scope.vis.type.editorConfig.collections;
      $scope.showColorRange = true;

      $scope.$watch('editorState.params.gauge.gaugeType', type => {
        switch (type) {
          case 'Arc':
            $scope.editorState.params.gauge.type = 'meter';
            $scope.editorState.params.gauge.minAngle = undefined;
            $scope.editorState.params.gauge.maxAngle = undefined;
            break;
          case 'Circle':
            $scope.editorState.params.gauge.type = 'meter';
            $scope.editorState.params.gauge.minAngle = 0;
            $scope.editorState.params.gauge.maxAngle = 2 * Math.PI;
            break;
          case 'Metric':
            $scope.editorState.params.gauge.type = 'simple';
        }
      });


      const updateLegend = () => {
        if (!$scope.editorState.params.gauge.style.bgColor && !$scope.editorState.params.gauge.style.labelColor) {
          $scope.editorState.params.addLegend = false;
        } else {
          $scope.editorState.params.addLegend = true;
        }
      };

      $scope.$watch('editorState.params.gauge.gaugeColorMode', newValue => {
        switch (newValue) {
          case 'Labels':
            $scope.editorState.params.gauge.style.labelColor = true;
            $scope.editorState.params.gauge.style.bgColor = false;
            break;
          case 'Background':
            $scope.editorState.params.gauge.style.labelColor = false;
            $scope.editorState.params.gauge.style.bgColor = true;
            break;
          case 'None':
            $scope.editorState.params.gauge.style.labelColor = false;
            $scope.editorState.params.gauge.style.bgColor = false;
            break;
        }
        updateLegend();
      });

      $scope.resetColors = function () {
        $scope.uiState.set('vis.colors', null);
        $scope.customColors = false;
      };

      $scope.getGreaterThan = function (index) {
        if (index === 0) return 0;
        return $scope.editorState.params.gauge.colorsRange[index - 1].to;
      };

      $scope.addRange = function () {
        const previousRange = _.last($scope.editorState.params.gauge.colorsRange);
        const from = previousRange ? previousRange.to : 0;
        const to = previousRange ? from + (previousRange.to - previousRange.from) : 100;
        $scope.editorState.params.gauge.colorsRange.push({ from: from, to: to });
      };

      $scope.removeRange = function (index) {
        $scope.editorState.params.gauge.colorsRange.splice(index, 1);
      };

      $scope.getColor = function (index) {
        const defaultColors = this.uiState.get('vis.defaultColors');
        const overwriteColors = this.uiState.get('vis.colors');
        const colors = defaultColors ? _.defaults({}, overwriteColors, defaultColors) : overwriteColors;
        return colors ? Object.values(colors)[index] : 'transparent';
      };

      $scope.uiState.on('colorChanged', () => {
        $scope.customColors = true;
      });

      $scope.requiredText = i18n('kbnVislibVisTypes.controls.gaugeOptions.requiredText', {
        defaultMessage: 'Required:'
      });

    }
  };
});
