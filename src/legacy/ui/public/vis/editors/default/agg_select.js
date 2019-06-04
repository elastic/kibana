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

import 'ngreact';
import { uiModules } from '../../../modules';
import { DefaultEditorAggSelect } from './components/default_editor_agg_select';
import { wrapInI18nContext } from 'ui/i18n';

uiModules
  .get('app/visualize', ['react'])
  .directive('visAggSelectReactWrapper', reactDirective => reactDirective(wrapInI18nContext(DefaultEditorAggSelect), [
    ['agg', { watchDepth: 'collection' }],
    ['aggTypeOptions', { watchDepth: 'collection' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    ['setValue', { watchDepth: 'reference' }],
    'aggHelpLink',
    'showValidation',
    'isSubAggregation',
    'value',
  ]))
  .directive('visAggSelect', function () {
    return {
      restrict: 'E',
      scope: true,
      require: '^ngModel',
      template: function () {
        return `<vis-agg-select-react-wrapper
            ng-if="setValidity"
            agg="agg"
            agg-help-link="aggHelpLink"
            agg-type-options="aggTypeOptions"
            show-validation="showValidation"
            is-sub-aggregation="isSubAggregation"
            value="paramValue"
            set-validity="setValidity"
            set-value="onChange"
            set-touched="setTouched"
          ></vis-agg-select-react-wrapper>`;
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('agg', attr.agg);
          $scope.$bind('aggTypeOptions', attr.aggTypeOptions);
          $scope.$bind('isSubAggregation', attr.isSubAggregation);
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          $scope.showValidation = false;

          $scope.$watch('agg.type', (value) => {
            // Whenever the value of the parameter changed (e.g. by a reset or actually by calling)
            // we store the new value in $scope.paramValue, which will be passed as a new value to the react component.
            $scope.paramValue = value;
          });

          $scope.$watch(() => {
            // The model can become touched either onBlur event or when the form is submitted.
            return ngModelCtrl.$touched;
          }, (value) => {
            if (value) {
              $scope.showValidation = true;
            }
          }, true);

          $scope.onChange = (value) => {
            $scope.paramValue = value;
            // This is obviously not a good code quality, but without using scope binding (which we can't see above)
            // to bind function values, this is right now the best temporary fix, until all of this will be gone.
            $scope.$parent.onAggTypeChange($scope.agg, value);
            $scope.showValidation = true;
            ngModelCtrl.$setDirty();
          };

          $scope.setTouched = () => {
            ngModelCtrl.$setTouched();
            $scope.showValidation = true;
          };

          $scope.setValidity = (isValid) => {
            ngModelCtrl.$setValidity(`agg${$scope.agg.id}`, isValid);
          };
        }
      }
    };
  });
