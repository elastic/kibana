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
import 'brace/mode/hjson';
import 'brace/ext/searchbox';
import 'ui/accessibility/kbn_ui_ace_keyboard_mode';
import 'ui/vis/map/service_settings';

import { once } from 'lodash';
// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import { makeChart } from '../directives/chart/chart';
// @ts-ignore
import { makeTimelionInterval } from '../directives/timelion_interval/timelion_interval';
// @ts-ignore
import { makeTimelionExpInput } from '../directives/timelion_expression_input';
// @ts-ignore
import { makeTimelionExpressionSuggestions } from '../directives/timelion_expression_suggestions/timelion_expression_suggestions';

/** @internal */
export const initTimelionLegacyModule = once((): void => {
  require('ui/state_management/app_state');

  uiModules
    .get('kibana/timelion_vis', ['kibana'])
    .controller('TimelionVisController', function($scope: any) {
      $scope.$on('timelionChartRendered', (event: any) => {
        event.stopPropagation();
        $scope.renderComplete();
      });
    })
    .directive('chart', makeChart)
    .directive('timelionInterval', makeTimelionInterval)
    .directive('timelionExpressionSuggestions', makeTimelionExpressionSuggestions)
    .directive('timelionExpressionInput', makeTimelionExpInput);
});
