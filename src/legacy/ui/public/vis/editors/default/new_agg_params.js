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
    ['aggType', { watchDepth: 'reference' }],
    ['indexPattern', { watchDepth: 'reference' }],
    ['responseValueAggs', { watchDepth: 'reference' }],
    ['vis', { watchDepth: 'reference' }],
    ['onAggTypeChange', { watchDepth: 'reference' }],
    ['onAggParamsChange', { watchDepth: 'reference' }],
    ['setTouched', { watchDepth: 'reference' }],
    ['setValidity', { watchDepth: 'reference' }],
    'id',
    'aggIndex',
    'groupName',
    'aggIsTooLow',
    'formIsTouched'
  ]))
  .directive('newVisEditorAggParams', function () {
    return {
      restrict: 'E',
      scope: true,
      require: '^ngModel',
      template: function () {
        return `<vis-agg-params-react-wrapper
            ng-if="onAggTypeChange"
            agg="agg"
            agg-index="aggIndex"
            agg-is-too-low="aggIsTooLow"
            agg-type="agg.type"
            form-is-touched="formIsTouched"
            group-name="groupName"
            index-pattern="indexPattern"
            response-value-aggs="responseValueAggs"
            vis="vis"
            on-agg-type-change="onAggTypeChange"
            on-agg-params-change="onAggParamsChange"
            set-touched="setTouched"
            set-validity="setValidity"
          ></vis-agg-params-react-wrapper>`;
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('agg', attr.agg);
          $scope.$bind('aggIndex', attr.aggIndex);
          $scope.$bind('indexPattern', attr.indexPattern);
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          $scope.formIsTouched = false;

          $scope.$watch(() => {
            // The model can become touched either onBlur event or when the form is submitted.
            return ngModelCtrl.$touched;
          }, (value) => {
            if (value) {
              $scope.formIsTouched = true;
            }
          }, true);

          $scope.setValidity = (isValid) => {
            ngModelCtrl.$setValidity(`aggParams${$scope.agg.id}`, isValid);
          };

          $scope.setTouched = () => {
            ngModelCtrl.$setTouched();
          };
        }
      }
    };
  });
