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

import { IModule } from 'angular';

import { Panel } from '../panels/panel';
// @ts-ignore
import { Chart } from '../directives/chart/chart';
// @ts-ignore
import { TimelionInterval } from '../directives/timelion_interval/timelion_interval';
// @ts-ignore
import { TimelionExpInput } from '../directives/timelion_expression_input';
// @ts-ignore
import { TimelionExpressionSuggestions } from '../directives/timelion_expression_suggestions/timelion_expression_suggestions';

/** @internal */
export const initTimelionVisLegacyModule = (
  angularIns: IModule,
  timelionPanels: Map<string, Panel>
): void => {
  angularIns
    .controller('TimelionVisController', function($scope: any) {
      $scope.$on('timelionChartRendered', (event: any) => {
        event.stopPropagation();
        $scope.renderComplete();
      });
    })
    .constant('timelionPanels', timelionPanels)
    .directive('chart', Chart)
    .directive('timelionInterval', TimelionInterval)
    .directive('timelionExpressionSuggestions', TimelionExpressionSuggestions)
    .directive('timelionExpressionInput', TimelionExpInput);
};
