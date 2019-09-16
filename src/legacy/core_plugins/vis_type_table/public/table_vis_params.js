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

import _ from 'lodash';
import { tabifyGetColumns } from 'ui/agg_response/tabify/_get_columns';
import tableVisParamsTemplate from './table_vis_params.html';
import { i18n } from '@kbn/i18n';

export function TableVisParams() {
  return {
    restrict: 'E',
    template: tableVisParamsTemplate,
    link: function ($scope) {
      const noCol = {
        value: '',
        name: i18n.translate('visTypeTable.params.defaultPercetangeCol', {
          defaultMessage: 'Don’t show',
        })
      };
      $scope.totalAggregations = ['sum', 'avg', 'min', 'max', 'count'];
      $scope.percentageColumns = [noCol];

      $scope.$watchMulti([
        '[]editorState.aggs.aggs',
        'editorState.params.percentageCol',
        '=editorState.params.dimensions.buckets',
        '=editorState.params.dimensions.metrics',
        'vis.dirty' // though not used directly in the callback, it is a strong indicator that we should recompute
      ], function () {
        const { aggs, params } = $scope.editorState;

        $scope.percentageColumns = [noCol, ...tabifyGetColumns(aggs.getResponseAggs(), true)
          .filter(col => isNumeric(_.get(col, 'aggConfig.type.name'), params.dimensions))
          .map(col => ({ value: col.name, name: col.name }))];

        if (!_.find($scope.percentageColumns, { value: params.percentageCol })) {
          params.percentageCol = $scope.percentageColumns[0].value;
        }
      }, true);

      $scope.$watchMulti(
        ['editorState.params.showPartialRows', 'editorState.params.showMetricsAtAllLevels'],
        function () {
          if (!$scope.vis) return;
          const params = $scope.editorState.params;
          $scope.metricsAtAllLevels = params.showPartialRows || params.showMetricsAtAllLevels;
        }
      );
    },
  };
}

/**
 * Determines if a aggConfig is numeric
 * @param {String} type - the type of the aggConfig
 * @param {Object} obj - dimensions of the current visualization or editor
 * @param {Object} obj.buckets
 * @param {Object} obj.metrics
 * @returns {Boolean}
 */
export function isNumeric(type, { buckets = [], metrics = [] } = {}) {
  const dimension =
    buckets.find(({ aggType }) => aggType === type) ||
    metrics.find(({ aggType }) => aggType === type);
  const formatType = _.get(dimension, 'format.id') || _.get(dimension, 'format.params.id');
  return formatType === 'number';
}
