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
import { uiModules } from 'ui/modules';
import vislibSeriesTemplate from './series.html';
const module = uiModules.get('kibana');

module.directive('vislibSeries', function () {
  return {
    restrict: 'E',
    template: vislibSeriesTemplate,
    replace: true,
    link: function ($scope) {
      function makeSerie(id, label) {
        const last = $scope.series[$scope.series.length - 1];
        return {
          show: true,
          mode: last ? last.mode : 'normal',
          type: last ? last.type : 'line',
          drawLinesBetweenPoints: last ? last.drawLinesBetweenPoints : true,
          showCircles: last ? last.showCircles : true,
          interpolate: last ? last.interpolate : 'linear',
          lineWidth: last ? last.lineWidth : 2,
          data: {
            id: id,
            label: label
          },
          valueAxis: last ? last.valueAxis : $scope.editorState.params.valueAxes[0].id
        };
      }

      $scope.series = $scope.editorState.params.seriesParams;
      $scope.$watch(() => {
        return $scope.editorState.aggs.map(agg => {
          return agg.makeLabel();
        }).join();
      }, () => {
        const schemaTitle = $scope.vis.type.schemas.metrics[0].title;

        const metrics = $scope.editorState.aggs.filter(agg => {
          const isMetric = agg.type && agg.type.type === 'metrics';
          return isMetric && agg.schema.title === schemaTitle;
        });

        // update labels for existing params or create new one
        $scope.editorState.params.seriesParams = metrics.map(agg => {
          const params = $scope.editorState.params.seriesParams.find(param => param.data.id === agg.id);
          if (params) {
            params.data.label = agg.makeLabel();
            return params;
          } else {
            const series = makeSerie(agg.id, agg.makeLabel());
            return series;
          }
        });
      });

      $scope.$watch(() => {
        return $scope.editorState.params.seriesParams.map(series => series.type).join();
      }, () => {
        const types = _.uniq(_.map($scope.editorState.params.seriesParams, 'type'));
        $scope.vis.type.type = types.length === 1 ? types[0] : 'histogram';
      });

      $scope.$watch('editorState.params.valueAxes.length', () => {
        $scope.editorState.params.seriesParams.forEach(series => {
          if (!$scope.editorState.params.valueAxes.find(axis => axis.id === series.valueAxis)) {
            series.valueAxis = $scope.editorState.params.valueAxes[0].id;
          }
        });
      });

      $scope.changeValueAxis = (index) => {
        const series = $scope.editorState.params.seriesParams[index];
        if (series.valueAxis === 'new') {
          const axis = $scope.addValueAxis();
          series.valueAxis = axis.id;
        }
        $scope.updateAxisTitle();
      };
    }
  };
});
