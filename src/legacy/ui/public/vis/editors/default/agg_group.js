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
import { DefaultEditorAggGroup } from './components/agg_group';

uiModules
  .get('app/visualize')
  .directive('visEditorAggGroupWrapper', reactDirective =>
    reactDirective(wrapInI18nContext(DefaultEditorAggGroup), [
      ['metricAggs', { watchDepth: 'reference' }], // we watch reference to identify each aggs change in useEffects
      ['schemas', { watchDepth: 'collection' }],
      ['state', { watchDepth: 'reference' }],
      ['addSchema', { watchDepth: 'reference' }],
      ['onAggParamsChange', { watchDepth: 'reference' }],
      ['onAggTypeChange', { watchDepth: 'reference' }],
      ['onToggleEnableAgg', { watchDepth: 'reference' }],
      ['removeAgg', { watchDepth: 'reference' }],
      ['reorderAggs', { watchDepth: 'reference' }],
      ['setTouched', { watchDepth: 'reference' }],
      ['setValidity', { watchDepth: 'reference' }],
      'groupName',
      'formIsTouched',
      'lastParentPipelineAggTitle',
      'currentTab',
    ])
  )
  .directive('visEditorAggGroup', function() {
    return {
      restrict: 'E',
      scope: true,
      require: '?^ngModel',
      template: function() {
        return `<vis-editor-agg-group-wrapper	
            ng-if="setValidity"	
            current-tab="sidebar.section"
            form-is-touched="formIsTouched"
            group-name="groupName"
            last-parent-pipeline-agg-title="lastParentPipelineAggTitle"
            metric-aggs="metricAggs"
            state="state"
            schemas="schemas"	
            add-schema="addSchema"	
            on-agg-params-change="onAggParamsChange"
            on-agg-type-change="onAggTypeChange"
            on-toggle-enable-agg="onToggleEnableAgg"
            remove-agg="removeAgg"
            reorder-aggs="reorderAggs"
            set-validity="setValidity"	
            set-touched="setTouched"	
          ></vis-editor-agg-group-wrapper>`;
      },
      link: function($scope, $el, attr, ngModelCtrl) {
        $scope.groupName = attr.groupName;
        $scope.$bind('schemas', attr.schemas);
        // The model can become touched either onBlur event or when the form is submitted.
        // We also watch $touched to identify when the form is submitted.
        $scope.$watch(
          () => {
            return ngModelCtrl.$touched;
          },
          value => {
            $scope.formIsTouched = value;
          }
        );

        $scope.setValidity = isValid => {
          ngModelCtrl.$setValidity(`aggGroup${$scope.groupName}`, isValid);
        };

        $scope.setTouched = isTouched => {
          if (isTouched) {
            ngModelCtrl.$setTouched();
          } else {
            ngModelCtrl.$setUntouched();
          }
        };
      },
    };
  });
