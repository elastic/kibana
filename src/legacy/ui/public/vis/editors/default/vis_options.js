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

import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from '../../../modules';
import { VisOptionsReactWrapper } from './vis_options_react_wrapper';

/**
 * This directive sort of "transcludes" in whatever template you pass in via the `editor` attribute.
 * This lets you specify a full-screen UI for editing a vis type, instead of using the regular
 * sidebar.
 */

uiModules
  .get('app/visualize')
  .directive('visOptionsReactWrapper', reactDirective => reactDirective(wrapInI18nContext(VisOptionsReactWrapper), [
    ['component', { wrapApply: false }],
    ['aggs', { watchDepth: 'collection' }],
    ['stateParams', { watchDepth: 'collection' }],
    ['vis', { watchDepth: 'collection' }],
    ['setValue', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    ['setVisType', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    'hasHistogramAgg',
    'currentTab',
  ]))
  .directive('visEditorVisOptions', function ($compile) {
    return {
      restrict: 'E',
      require: '?^ngModel',
      scope: {
        vis: '=',
        visData: '=',
        uiState: '=',
        editor: '=',
        visualizeEditor: '=',
        editorState: '=',
        onAggParamsChange: '=',
        hasHistogramAgg: '=',
      },
      link: function ($scope, $el, attrs, ngModelCtrl) {
        $scope.setValue = (paramName, value) =>
          $scope.onAggParamsChange($scope.editorState.params, paramName, value);

        $scope.setValidity = isValid => {
          ngModelCtrl.$setValidity(`visOptions`, isValid);
        };

        $scope.setTouched = isTouched => {
          if (isTouched) {
            ngModelCtrl.$setTouched();
          } else {
            ngModelCtrl.$setUntouched();
          }
        };

        $scope.setVisType = (vis, type) => {
          vis.type.type = type;
        };

        const comp = typeof $scope.editor === 'string' ?
          $scope.editor :
          `<vis-options-react-wrapper
            component="editor"
            has-histogram-agg="hasHistogramAgg"
            aggs="editorState.aggs"
            current-tab="$parent.$parent.sidebar.section"
            state-params="editorState.params"
            vis="vis"
            set-value="setValue"
            set-validity="setValidity"
            set-vis-type="setVisType"
            set-touched="setTouched">
          </vis-options-react-wrapper>`;
        const $editor = $compile(comp)($scope);
        $el.append($editor);
      }
    };
  });
