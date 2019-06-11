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
import { DefaultEditorAggParams } from './components/default_editor_agg_params';

uiModules
  .get('app/visualize')
  .directive('visAggParamsReactWrapper', reactDirective => reactDirective(wrapInI18nContext(DefaultEditorAggParams), [
    ['agg', { watchDepth: 'collection' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['onAggTypeChange', { watchDepth: 'reference' }],
    ['aggType', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    'id',
    'aggIndex',
    'groupName',
    'aggIsTooLow',
    'showValidation'
  ]))
  .directive('newVisEditorAggParams', function () {
    return {
      restrict: 'E',
      scope: true,
      require: '^ngModel',
      template: function () {
        return `<vis-agg-params-react-wrapper
            ng-if="setValidity"
            agg="agg"
            agg-index="aggIndex"
            agg-is-too-low="aggIsTooLow"
            agg-type="agg.type"
            group-name="groupName"
            index-pattern="indexPattern"
            on-agg-type-change="onAggTypeChange"
            set-validity="setValidity"
            set-touched="setTouched"
            show-validation="showValidation"
          ></vis-agg-params-react-wrapper>`;
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('agg', attr.agg);
          $scope.$bind('aggIndex', attr.aggIndex);
          $scope.$bind('aggIsTooLow', attr.aggIsTooLow);
          $scope.$bind('indexPattern', attr.indexPattern);
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          $scope.showValidation = false;

          // $scope.$watch('agg.type', (value) => {
          //   // Whenever the value of the parameter changed (e.g. by a reset or actually by calling)
          //   // we store the new value in $scope.paramValue, which will be passed as a new value to the react component.
          //   $scope.paramValue = value;
          // });

          $scope.$watch(() => {
            // The model can become touched either onBlur event or when the form is submitted.
            return ngModelCtrl.$touched;
          }, (value) => {
            if (value) {
              $scope.showValidation = true;
            }
          }, true);

          // $scope.onChange = (value) => {
          //   $scope.paramValue = value;
          //   // This is obviously not a good code quality, but without using scope binding (which we can't see above)
          //   // to bind function values, this is right now the best temporary fix, until all of this will be gone.
          //   $scope.$parent.onAggTypeChange($scope.agg, value);
          //   $scope.showValidation = true;
          //   ngModelCtrl.$setDirty();
          // };

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
