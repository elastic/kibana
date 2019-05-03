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
import { AggParamReactWrapper } from './agg_param_react_wrapper';

uiModules
  .get('app/visualize')
  .directive('visAggParamReactWrapper', reactDirective => reactDirective(wrapInI18nContext(AggParamReactWrapper), [
    ['agg', { watchDepth: 'collection' }],
    ['aggParam', { watchDepth: 'reference' }],
    ['aggParams', { watchDepth: 'collection' }],
    ['editorConfig', { watchDepth: 'collection' }],
    ['indexedFields', { watchDepth: 'collection' }],
    ['paramEditor', { wrapApply: false }],
    ['onChange', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    'showValidation',
    'value',
  ]))
  .directive('visAggParamEditor', function (config) {
    return {
      restrict: 'E',
      // We can't use scope binding here yet, since quiet a lot of child directives arbitrary access
      // parent scope values right now. So we cannot easy change this, until we remove the whole directive.
      scope: true,
      require: '?^ngModel',
      template: function ($el, attrs) {
        if (attrs.editorComponent) {
          // Why do we need the `ng-if` here?
          // Short answer: Preventing black magic
          // Longer answer: The way this component is mounted in agg_params.js (by manually compiling)
          //   and adding to some array, once you switch an aggregation type, this component will once
          //   render once with a "broken state" (something like new aggParam, but still old template),
          //   before agg_params.js actually removes it from the DOM and create a correct version with
          //   the correct template. That ng-if check prevents us from crashing during that broken render.
          return `<vis-agg-param-react-wrapper
            ng-if="editorComponent"
            param-editor="editorComponent"
            agg="agg"
            agg-params="agg.params"
            agg-param="aggParam"
            editor-config="editorConfig"
            indexed-fields="indexedFields"
            show-validation="showValidation"
            value="paramValue"
            on-change="onChange"
            set-touched="setTouched"
            set-validity="setValidity"
          ></vis-agg-param-react-wrapper>`;
        }

        return $el.html();
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('aggParam', attr.aggParam);
          $scope.$bind('editorComponent', attr.editorComponent);
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          $scope.config = config;
          $scope.showValidation = false;

          if (attr.editorComponent) {
            $scope.$watch('agg.params[aggParam.name]', (value) => {
              // Whenever the value of the parameter changed (e.g. by a reset or actually by calling)
              // we store the new value in $scope.paramValue, which will be passed as a new value to the react component.
              $scope.paramValue = value;
            }, true);

            $scope.$watch(() => {
              // The model can become touched either onBlur event or when the form is submitted.
              return ngModelCtrl.$touched;
            }, (value) => {
              if (value) {
                $scope.showValidation = true;
              }
            }, true);

            $scope.paramValue = $scope.agg.params[$scope.aggParam.name];
          }

          $scope.onChange = (value) => {
            $scope.paramValue = value;
            $scope.onParamChange($scope.agg, $scope.aggParam.name, value);
            $scope.showValidation = true;
            ngModelCtrl.$setDirty();
          };

          $scope.setTouched = () => {
            ngModelCtrl.$setTouched();
            $scope.showValidation = true;
          };

          $scope.setValidity = (isValid) => {
            ngModelCtrl.$setValidity(`agg${$scope.agg.id}${$scope.aggParam.name}`, isValid);
          };
        }
      }
    };
  });
