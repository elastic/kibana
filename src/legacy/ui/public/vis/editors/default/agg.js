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
import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from '../../../modules';
import { DefaultEditorAgg } from './components/default_editor_agg';

uiModules
  .get('app/visualize')
  .directive('visEditorAggReactWrapper', reactDirective =>
    reactDirective(wrapInI18nContext(DefaultEditorAgg), [
      ['agg', { watchDepth: 'reference' }],
      ['group', { watchDepth: 'reference' }],
      ['indexPattern', { watchDepth: 'reference' }],
      ['responseValueAggs', { watchDepth: 'reference' }], // we watch reference to identify each aggs change in useEffects
      ['schemas', { watchDepth: 'reference' }],
      ['state', { watchDepth: 'reference' }],
      ['stats', { watchDepth: 'reference' }],
      ['vis', { watchDepth: 'reference' }],
      ['addSchema', { watchDepth: 'reference' }],
      ['onAggErrorChanged', { watchDepth: 'reference' }],
      ['onAggTypeChange', { watchDepth: 'reference' }],
      ['onAggParamsChange', { watchDepth: 'reference' }],
      ['removeAgg', { watchDepth: 'reference' }],
      ['onToggleEnableAgg', { watchDepth: 'reference' }],
      ['setTouched', { watchDepth: 'reference' }],
      ['setValidity', { watchDepth: 'reference' }],
      'aggIndex',
      'groupName',
      'formIsTouched',
      'isDraggable',
      'isValid'
    ])
  )
  .directive('visEditorAgg', function (config) {
    return {
      restrict: 'E',
      // We can't use scope binding here yet, since quiet a lot of child directives arbitrary access
      // parent scope values right now. So we cannot easy change this, until we remove the whole directive.
      scope: true,
      require: '?^ngModel',
      template: function ($el, attrs) {
        return `<vis-editor-agg-react-wrapper	
            ng-if="setValidity"	
            agg="agg"	
            agg-index="$index"
            group="group"
            groupName="groupName"
            indexed-fields="indexedFields"
            is-valid="aggForm.$valid"
            show-validation="showValidation"	
            schemas="schemas"
            state="state"
            stats="stats"
            vis="vis"	
            add-schema="addSchema"	
            set-touched="setTouched"	
            set-validity="setValidity"	
            response-value-aggs="responseValueAggs"
            on-agg-error-changed="onAggErrorChanged"
            on-agg-type-change="onAggTypeChange"
            on-agg-params-change="onAggParamsChange"
            remove-agg="removeAgg"
            on-toggle-enable-agg="onToggleEnableAgg"
          ></vis-editor-agg-react-wrapper>`;

        return $el.html();
      },
      link: {
        pre: function ($scope, $el, attr) {
          // $scope.$bind('aggParam', attr.aggParam);
          // $scope.$bind('editorComponent', attr.editorComponent);
        },
        post: function ($scope, $el, attr, ngModelCtrl) {
          // The model can become touched either onBlur event or when the form is submitted.
          // We watch $touched to identify when the form is submitted.
          $scope.$watch(
            () => {
              return ngModelCtrl.$touched;
            },
            value => {
              $scope.formIsTouched = value;
            },
            true
          );

          $scope.onAggTypeChange = (agg, value) => {
            if (agg.type !== value) {
              agg.type = value;
            }
          };

          $scope.onAggParamsChange = (params, paramName, value) => {
            if (params[paramName] !== value) {
              params[paramName] = value;
            }
          };

          $scope.setValidity = isValid => {
            ngModelCtrl.$setValidity(`aggParams${$scope.agg.id}`, isValid);
          };

          $scope.setTouched = isTouched => {
            if (isTouched) {
              ngModelCtrl.$setTouched();
            } else {
              ngModelCtrl.$setUntouched();
            }
          };

          $scope.onAggErrorChanged = (agg, error) => {
            if (error) {
              agg.error = error;
            } else {
              delete agg.error;
            }
          };
        },
      },
    };
  });
