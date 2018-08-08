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

export function PointSeriesTooltipFormatter($compile, $rootScope) {

  const $tooltipScope = $rootScope.$new();
  const $tooltip = $(require('ui/agg_response/point_series/_tooltip.html'));
  $compile($tooltip)($tooltipScope);

  return function tooltipFormatter(event) {
    const datum = event.datum;
    if (!datum || !datum.aggConfigResult) return '';

    const details = $tooltipScope.details = [];
    let result = { $parent: datum.aggConfigResult };

    function addDetail(result) {
      const agg = result.aggConfig;
      const value = result.value;

      const detail = {
        value: agg.fieldFormatter()(value),
        label: agg.makeLabel()
      };

      if (agg === datum.aggConfigResult.aggConfig) {
        detail.percent = event.percent;
        if (datum.yScale != null) {
          detail.value = agg.fieldFormatter()(value * datum.yScale);
        }
      }

      details.push(detail);
    }

    datum.extraMetrics.forEach(addDetail);
    while ((result = result.$parent) && result.aggConfig) {
      addDetail(result);
    }


    $tooltipScope.$apply();
    return $tooltip[0].outerHTML;
  };
}
