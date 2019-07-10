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
import { DefaultEditorAggGroup } from './components/default_editor_agg_group';
import { AggConfig } from '../../agg_config';

uiModules
  .get('app/visualize')
  .directive('visEditorAggGroupWrapper', reactDirective =>
    reactDirective(wrapInI18nContext(DefaultEditorAggGroup), [
      ['responseValueAggs', { watchDepth: 'reference' }], // we watch reference to identify each aggs change in useEffects
      ['state', { watchDepth: 'reference' }],
      ['vis', { watchDepth: 'reference' }],
      ['addSchema', { watchDepth: 'reference' }],
      ['removeAgg', { watchDepth: 'reference' }],
      ['onToggleEnableAgg', { watchDepth: 'reference' }],
      ['onAggErrorChanged', { watchDepth: 'reference' }],
      ['onAggTypeChange', { watchDepth: 'reference' }],
      ['onAggParamsChange', { watchDepth: 'reference' }],
      ['setTouched', { watchDepth: 'reference' }],
      ['setValidity', { watchDepth: 'reference' }],
      'groupName',
      'formIsTouched',
    ])
  )
  .directive('visEditorAggGroup', function () {
    return {
      restrict: 'E',
      // We can't use scope binding here yet, since quiet a lot of child directives arbitrary access
      // parent scope values right now. So we cannot easy change this, until we remove the whole directive.
      scope: true,
      require: '?^ngModel',
      template: function ($el, attrs) {
        return `<vis-editor-agg-group-wrapper	
            ng-if="setValidity"	
            group-name="groupName"
            state="state"
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
          ></vis-editor-agg-group-wrapper>`;
      },
      link: function ($scope, $el, attr, ngModelCtrl) {
        $scope.groupName = attr.groupName;
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
          ngModelCtrl.$setValidity('aggGroup', isValid);
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

        $scope.addSchema = function (schema) {
          const aggConfig = new AggConfig($scope.state.aggs, {
            schema,
            id: AggConfig.nextId($scope.state.aggs),
          });
          aggConfig.brandNew = true;

          $scope.state.aggs.push(aggConfig);
        };

        $scope.removeAgg = function (agg) {
          const aggs = $scope.state.aggs;
          const index = aggs.indexOf(agg);

          if (index === -1) {
            return;
          }

          aggs.splice(index, 1);
        };

        $scope.onToggleEnableAgg = (agg, isEnable) => {
          agg.enabled = isEnable;
        };
      },
    };
  });
