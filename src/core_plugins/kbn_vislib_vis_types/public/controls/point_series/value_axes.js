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
import vislibValueAxesTemplate from './value_axes.html';
const module = uiModules.get('kibana');

module.directive('vislibValueAxes', function () {
  return {
    restrict: 'E',
    template: vislibValueAxesTemplate,
    replace: true,
    link: function ($scope) {
      let isCategoryAxisHorizontal = true;

      function mapPosition(position) {
        switch (position) {
          case 'bottom': return 'left';
          case 'top': return 'right';
          case 'left': return 'bottom';
          case 'right': return 'top';
        }
      }

      function mapPositionOposite(position) {
        switch (position) {
          case 'bottom': return 'top';
          case 'top': return 'bottom';
          case 'left': return 'right';
          case 'right': return 'left';
        }
      }

      $scope.rotateOptions = [
        { name: 'horizontal', value: 0 },
        { name: 'vertical', value: 90 },
        { name: 'angled', value: 75 },
      ];

      $scope.$watch('vis.params.categoryAxes[0].position', position => {
        isCategoryAxisHorizontal = ['top', 'bottom'].includes(position);
        $scope.vis.params.valueAxes.forEach(axis => {
          const axisIsHorizontal = ['top', 'bottom'].includes(axis.position);
          if (axisIsHorizontal === isCategoryAxisHorizontal) {
            axis.position = mapPosition(axis.position);
            $scope.updateAxisName(axis);
          }
        });
      });

      $scope.getSeries = function (axis) {
        const isFirst = $scope.vis.params.valueAxes[0] === axis;
        const series = $scope.vis.params.seriesParams.filter(series =>
          (series.valueAxis === axis.id || (isFirst && !series.valueAxis))
        );
        return series.map(series => series.data.label).join(', ');
      };

      $scope.getSeriesShort = function (axis) {
        const maxStringLength = 30;
        return $scope.getSeries(axis).substring(0, maxStringLength);
      };

      $scope.isPositionDisabled = function (position) {
        if (isCategoryAxisHorizontal) {
          return ['top', 'bottom'].includes(position);
        }
        return ['left', 'right'].includes(position);
      };

      $scope.addValueAxis = function () {
        const firstAxis = $scope.vis.params.valueAxes[0];
        const newAxis = _.cloneDeep(firstAxis);
        newAxis.id = 'ValueAxis-' + $scope.vis.params.valueAxes.reduce((value, axis) => {
          if (axis.id.substr(0, 10) === 'ValueAxis-') {
            const num = parseInt(axis.id.substr(10));
            if (num >= value) value = num + 1;
          }
          return value;
        }, 1);

        newAxis.position = mapPositionOposite(firstAxis.position);
        const axisName = _.capitalize(newAxis.position) + 'Axis-';
        newAxis.name = axisName + $scope.vis.params.valueAxes.reduce((value, axis) => {
          if (axis.name.substr(0, axisName.length) === axisName) {
            const num = parseInt(axis.name.substr(axisName.length));
            if (num >= value) value = num + 1;
          }
          return value;
        }, 1);

        $scope.vis.params.valueAxes.push(newAxis);
        return newAxis;
      };

      $scope.removeValueAxis = function (axis) {
        if ($scope.vis.params.valueAxes.length > 1) {
          _.remove($scope.vis.params.valueAxes, function (valAxis) {
            return valAxis.id === axis.id;
          });
        }
      };

      $scope.updateExtents = function (axis) {
        if (!axis.scale.setYExtents) {
          delete axis.scale.min;
          delete axis.scale.max;
        }
      };

      $scope.updateAxisName = function (axis) {
        const axisName = _.capitalize(axis.position) + 'Axis-';
        axis.name = axisName + $scope.vis.params.valueAxes.reduce((value, axis) => {
          if (axis.name.substr(0, axisName.length) === axisName) {
            const num = parseInt(axis.name.substr(axisName.length));
            if (num >= value) value = num + 1;
          }
          return value;
        }, 1);
      };

      const lastAxisTitles = {};
      $scope.updateAxisTitle = function () {
        $scope.vis.params.valueAxes.forEach((axis, axisNumber) => {
          let label = '';
          const isFirst = axisNumber === 0;
          const matchingSeries = [];
          $scope.vis.params.seriesParams.forEach((series, i) => {
            const isMatchingSeries = (isFirst && !series.valueAxis) || (series.valueAxis === axis.id);
            if (isMatchingSeries) {
              let seriesNumber = 0;
              $scope.vis.getAggConfig().forEach(agg => {
                if (agg.schema.name === 'metric') {
                  if (seriesNumber === i) matchingSeries.push(agg);
                  seriesNumber++;
                }
              });
            }
          });
          if (matchingSeries.length === 1) {
            label = matchingSeries[0].makeLabel();
          }
          if (lastAxisTitles[axis.id] !== label && label !== '') {
            lastAxisTitles[axis.id] = label;
            axis.title.text = label;
          }
        });
      };

      $scope.$watch(() => {
        return $scope.vis.getAggConfig().map(agg => {
          return agg.makeLabel();
        }).join();
      }, () => {
        $scope.updateAxisTitle();
      });
    }
  };
});
