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
import './agg_group';
import './vis_options';
import 'ui/directives/css_truncate';
import { uiModules } from '../../../modules';
import sidebarTemplate from './sidebar.html';
import { move } from '../../../utils/collection';
import { AggConfig } from '../../agg_config';

uiModules.get('app/visualize').directive('visEditorSidebar', function () {
  return {
    restrict: 'E',
    template: sidebarTemplate,
    scope: true,
    require: '?^ngModel',
    controllerAs: 'sidebar',
    controller: function ($scope) {
      $scope.$watch('vis.type', visType => {
        if (visType) {
          this.showData = visType.schemas.buckets || visType.schemas.metrics;
          if (_.has(visType, 'editorConfig.optionTabs')) {
            const activeTabs = visType.editorConfig.optionTabs.filter(tab => {
              return _.get(tab, 'active', false);
            });
            if (activeTabs.length > 0) {
              this.section = activeTabs[0].name;
            }
          }
          this.section =
            this.section ||
            (this.showData ? 'data' : _.get(visType, 'editorConfig.optionTabs[0].name'));
        }
      });

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

      $scope.reorderAggs = (group) => {
        //the aggs have been reordered in [group] and we need
        //to apply that ordering to [vis.aggs]
        const indexOffset = $scope.state.aggs.indexOf(group[0]);
        _.forEach(group, (agg, index) => {
          move($scope.state.aggs, agg, indexOffset + index);
        });
      };
    },
  };
});
