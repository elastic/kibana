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
import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from '../../../modules';
import { AggParamReactWrapper } from './agg_param_react_wrapper';

uiModules
  .get('app/visualize')
  .directive('visAggParamReactWrapper', reactDirective => reactDirective(wrapInI18nContext(AggParamReactWrapper), [
    ['agg', { watchDepth: 'collection' }],
    ['aggParam', { watchDepth: 'reference' }],
    ['editorConfig', { watchDepth: 'collection' }],
    ['indexedFields', { watchDepth: 'collection' }],
    ['paramEditor', { wrapApply: false }],
    ['onChange', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    'field',
    'interval',
    'customInterval',
    'isInvalid',
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
            agg-param="aggParam"
            editor-config="editorConfig"
            field="agg.params.field"
            interval="agg.params.interval"
            custom-interval="agg.params.customInterval"
            indexed-fields="indexedFields"
            is-invalid="isInvalid"
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
          $scope.$bind('agg', attr.agg);
          $scope.$bind('editorComponent', attr.editorComponent);
          $scope.$bind('editorConfig', attr.editorConfig);
          $scope.$bind('indexedFields', attr.indexedFields);

          if (attr.editorComponent) {
            $scope.$bind('vis', attr.vis);
          }
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          let _isInvalid = false;
          $scope.config = config;

          if (attr.editorComponent) {
            $scope.$watch('agg.params[aggParam.name]', (value) => {
              // Whenever the value of the parameter changed (e.g. by a reset or actually by calling)
              // we store the new value in $scope.paramValue, which will be passed as a new value to the react component.
              $scope.paramValue = value;

              $scope.setValidity(true);
              showValidation();
            }, true);

            $scope.$watch(() => {
              // The model can become touched either onBlur event or when the form is submitted.
              return ngModelCtrl.$touched;
            }, (value) => {
              if (value) {
                showValidation();
              }
            }, true);

            $scope.$watch('vis.dirty', debounce(isDirty => {
              const modelValue = $scope.agg.params[$scope.aggParam.name];
              if (!isDirty && $scope.paramValue !== modelValue) {
                // Since we don't update the state model (via $scope.$parent.onParamChange) when the value is invalid,
                // we need to reset the current invalid value to the saved valid value when a user discards changes.
                $scope.paramValue = modelValue;
                $scope.setValidity(true);
                showValidation();
              }
            }), 800);

            $scope.paramValue = $scope.agg.params[$scope.aggParam.name];
          }

          $scope.onChange = (value) => {
            $scope.paramValue = value;

            if (_isInvalid) {
              // We do the discard button available manually because we don't set invalid value into the state model.
              $scope.vis.dirty = true;
            } else {
              // This is obviously not a good code quality, but without using scope binding (which we can't see above)
              // to bind function values, this is right now the best temporary fix, until all of this will be gone.
              $scope.$parent.onParamChange($scope.agg, $scope.aggParam.name, value);
            }

            ngModelCtrl.$setDirty();
          };

          $scope.setTouched = () => {
            ngModelCtrl.$setTouched();
            showValidation();
          };

          $scope.setValidity = (isValid) => {
            _isInvalid = !isValid;
            ngModelCtrl.$setValidity(`agg${$scope.agg.id}${$scope.aggParam.name}`, isValid);
          };

          function showValidation() {
            $scope.isInvalid = _isInvalid;
          }
        }
      }
    };
  });
