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

import { i18n } from '@kbn/i18n';
import './agg_params';
import './agg_add';
import './controls/agg_controls';
import { Direction } from './keyboard_move';
import _ from 'lodash';
import './fancy_forms';
import { uiModules } from '../../../modules';
import aggTemplate from './agg.html';
import { move } from '../../../utils/collection';

uiModules
  .get('app/visualize')
  .directive('visEditorAgg', () => {
    return {
      restrict: 'A',
      template: aggTemplate,
      require: ['^form', '^ngModel'],
      link: function ($scope, $el, attrs, [kbnForm, ngModelCtrl]) {
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

        if ($scope.groupName === 'buckets') {
          $scope.$watchMulti([
            '$last',
            'lastParentPipelineAggTitle',
            'agg.type'
          ], function ([isLastBucket, lastParentPipelineAggTitle, aggType]) {
            $scope.error = null;
            $scope.disabledParams = [];

            if (!lastParentPipelineAggTitle || !isLastBucket || !aggType) {
              return;
            }

            if (['date_histogram', 'histogram'].includes(aggType.name)) {
              $scope.onAggParamsChange(
                $scope.agg.params,
                'min_doc_count',
                // "histogram" agg has an editor for "min_doc_count" param, which accepts boolean
                // "date_histogram" agg doesn't have an editor for "min_doc_count" param, it should be set as a numeric value
                aggType.name === 'histogram' ? true : 0);
              $scope.disabledParams = ['min_doc_count'];
            } else {
              $scope.error = i18n.translate('common.ui.aggTypes.metrics.wrongLastBucketTypeErrorMessage', {
                defaultMessage: 'Last bucket aggregation must be "Date Histogram" or "Histogram" when using "{type}" metric aggregation.',
                values: { type: lastParentPipelineAggTitle },
                description: 'Date Histogram and Histogram should not be translated',
              });
            }
          });
        }

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

        // The model can become touched either onBlur event or when the form is submitted.
        // We watch $touched to identify when the form is submitted.
        $scope.$watch(() => {
          return ngModelCtrl.$touched;
        }, (value) => {
          $scope.formIsTouched = value;
        }, true);

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

        $scope.setValidity = (isValid) => {
          ngModelCtrl.$setValidity(`aggParams${$scope.agg.id}`, isValid);
        };

        $scope.setTouched = (isTouched) => {
          if (isTouched) {
            ngModelCtrl.$setTouched();
          } else {
            ngModelCtrl.$setUntouched();
          }
        };
      }
    };
  });
