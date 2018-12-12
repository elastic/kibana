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
import tagCloudVisParamsTemplate from './tag_cloud_vis_params.html';
import noUiSlider from 'no-ui-slider';
import 'no-ui-slider/css/nouislider.css';
import 'no-ui-slider/css/nouislider.pips.css';
import 'no-ui-slider/css/nouislider.tooltips.css';

uiModules.get('kibana/table_vis')
  .directive('tagcloudVisParams', function () {
    return {
      restrict: 'E',
      template: tagCloudVisParamsTemplate,
      link: function ($scope, $element) {
        const sliderContainer = $element[0];
        const slider = sliderContainer.querySelector('.tgcFontSizeSlider');
        $scope.config = $scope.vis.type.editorConfig;
        noUiSlider.create(slider, {
          start: [$scope.editorState.params.minFontSize, $scope.editorState.params.maxFontSize],
          connect: true,
          step: 1,
          range: { 'min': 1, 'max': 100 },
          format: { to: (value) => parseInt(value), from: value => parseInt(value) }
        });
        slider.noUiSlider.on('slide', function () {
          const fontSize = slider.noUiSlider.get();
          $scope.$apply(() => {
            $scope.editorState.params.minFontSize = fontSize[0];
            $scope.editorState.params.maxFontSize = fontSize[1];
          });
        });

        /**
         * Whenever the params change (e.g. by hitting reset in the editor)
         * set the uislider value to the new value.
         */
        $scope.$watch('editorState.params.minFontSize', (val) => {
          val = parseInt(val);
          if (slider.noUiSlider.get()[0] !== val) {
            slider.noUiSlider.set([val, null]);
          }
        });
        $scope.$watch('editorState.params.maxFontSize', (val) => {
          val = parseInt(val);
          if (slider.noUiSlider.get()[1] !== val) {
            slider.noUiSlider.set([null, val]);
          }
        });
      }
    };
  });
