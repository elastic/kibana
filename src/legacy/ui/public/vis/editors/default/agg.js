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

import $ from 'jquery';
import './agg_params';
import './new_agg_params';
import './agg_add';
import { Direction } from './keyboard_move';
import _ from 'lodash';
import '../../../fancy_forms';
import { uiModules } from '../../../modules';
import aggTemplate from './agg.html';
import { move } from '../../../utils/collection';

uiModules
  .get('app/visualize')
  .directive('visEditorAgg', ($compile) => {
    return {
      restrict: 'A',
      template: aggTemplate,
      require: ['form', '^^form'],
      link: function ($scope, $el, attrs, controllers) {
        const kbnForm = controllers[0];
        const visualizeEditorForm = controllers[1];
        $scope.editorOpen = !!$scope.agg.brandNew;
        $scope.aggIsTooLow = false;

        $scope.$watch('editorOpen', function (open) {
        // make sure that all of the form inputs are "touched"
        // so that their errors propagate
          if (!open) kbnForm.$setTouched();
        });

        $scope.$watchMulti([
          '$index',
          'group.length'
        ], function () {
          $scope.aggIsTooLow = calcAggIsTooLow();
        });

        /**
       * Describe the aggregation, for display in the collapsed agg header
       * @return {[type]} [description]
       */
        $scope.describe = function () {
          if (!$scope.agg.type || !$scope.agg.type.makeLabel) return '';
          const label = $scope.agg.type.makeLabel($scope.agg);
          return label ? label : '';
        };

        $scope.$on('drag-start', () => {
          $scope.editorWasOpen = $scope.editorOpen;
          $scope.editorOpen = false;
          $scope.$emit('agg-drag-start', $scope.agg);
        });

        $scope.$on('drag-end', () => {
          $scope.editorOpen = $scope.editorWasOpen;
          $scope.$emit('agg-drag-end', $scope.agg);
        });

        /**
       * Move aggregations down/up in the priority list by pressing arrow keys.
       */
        $scope.onPriorityReorder = function (direction) {
          const positionOffset = direction === Direction.down ? 1 : -1;

          const currentPosition = $scope.group.indexOf($scope.agg);
          const newPosition = Math.max(0, Math.min(currentPosition + positionOffset, $scope.group.length - 1));
          move($scope.group, currentPosition, newPosition);
          $scope.$emit('agg-reorder');
        };

        $scope.remove = function (agg) {
          const aggs = $scope.state.aggs;
          const index = aggs.indexOf(agg);

          if (index === -1) {
            return;
          }

          aggs.splice(index, 1);
        };

        $scope.canRemove = function (aggregation) {
          const metricCount = _.reduce($scope.group, function (count, agg) {
            return (agg.schema.name === aggregation.schema.name) ? ++count : count;
          }, 0);

          // make sure the the number of these aggs is above the min
          return metricCount > aggregation.schema.min;
        };

        function calcAggIsTooLow() {
          if (!$scope.agg.schema.mustBeFirst) {
            return false;
          }

          const firstDifferentSchema = _.findIndex($scope.group, function (agg) {
            return agg.schema !== $scope.agg.schema;
          });

          if (firstDifferentSchema === -1) {
            return false;
          }

          return $scope.$index > firstDifferentSchema;
        }

        $scope.onAggTypeChange = (agg, value) => {
          if (agg.type !== value) {
            agg.type = value;
            $scope.updateParamModels(value ? value.params : []);
          }
        };

        $scope.onAggParamsChange = (agg, paramName, value) => {
          if (agg.params[paramName] !== value) {
            agg.params[paramName] = value;
          }
        };

        $scope.formIsTouched = false;

        $scope.$watch(() => {
          // The model can become touched either onBlur event or when the form is submitted.
          return visualizeEditorForm.$submitted;
        }, (value) => {
          if (value) {
            $scope.formIsTouched = true;
          }
        }, true);

        visualizeEditorForm.$$element.on('submit', function () {
          debugger;
          console.log('ON SUBMIT');
        });

        $scope.setValidity = (paramName, isValid) => {
          const modelName = normalizeModelName(`_internalNgModelState${$scope.agg.id}${paramName}`);
          const modelCtrl = kbnForm.$$controls.find(ctrl => ctrl.$$attr.ngModel === modelName);
          modelCtrl && modelCtrl.$setValidity(`aggParams${$scope.agg.id}${paramName}`, isValid);
          console.log(`setValidity ${modelName} - ${isValid}, ctlr - ${modelCtrl}`);
        };

        $scope.setTouched = (paramName) => {
          const modelName = normalizeModelName(`_internalNgModelState${$scope.agg.id}${paramName}`);
          const modelCtrl = kbnForm.$$controls.find(ctrl => ctrl.$$attr.ngModel === modelName);
          modelCtrl && modelCtrl.$setTouched();
        };

        const $aggParamModelsTmpl = $('<div>').addClass('ng-hide').appendTo($el);
        $scope.updateParamModels = (params) => {
          $aggParamModelsTmpl.empty();
          params.map(param => {
            const modelName = normalizeModelName(`_internalNgModelState${$scope.agg.id}${param.name}`);
            console.log(`create model - ${modelName}`);
            $aggParamModelsTmpl
              .append(`<div ng-model="${modelName}"></div>`);
          });
          $compile($aggParamModelsTmpl)($scope.$new());
        };

        function normalizeModelName(modelName = '') {
          return modelName.replace(/-/g, '_');
        }
      }
    };
  });
