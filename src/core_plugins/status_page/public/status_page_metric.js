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

import formatNumber from './lib/format_number';
import { uiModules } from 'ui/modules';
import statusPageMetricTemplate from './status_page_metric.html';

uiModules
  .get('kibana', [])
  .filter('statusMetric', function () {
    return function (input, type) {
      const metrics = [].concat(input);
      return metrics.map(function (metric) {
        return formatNumber(metric, type);
      }).join(', ');
    };
  })
  .directive('statusPageMetric', function () {
    return {
      restrict: 'E',
      template: statusPageMetricTemplate,
      scope: {
        metric: '=',
      },
      controllerAs: 'metric'
    };
  });
