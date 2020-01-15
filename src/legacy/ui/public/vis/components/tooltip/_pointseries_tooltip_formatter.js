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

import chrome from 'ui/chrome';

import template from './_pointseries_tooltip.html';

export function PointSeriesTooltipFormatterProvider($compile, $rootScope) {
  const $tooltipScope = $rootScope.$new();
  const $tooltip = $(template);
  $compile($tooltip)($tooltipScope);

  return function() {
    return function tooltipFormatter(event) {
      const data = event.data;
      const datum = event.datum;
      if (!datum) return '';

      const details = ($tooltipScope.details = []);

      const currentSeries =
        data.series && data.series.find(serie => serie.rawId === datum.seriesId);
      const addDetail = (label, value) => details.push({ label, value });

      if (datum.extraMetrics) {
        datum.extraMetrics.forEach(metric => {
          addDetail(metric.label, metric.value);
        });
      }

      if (datum.x) {
        addDetail(data.xAxisLabel, data.xAxisFormatter(datum.x));
      }
      if (datum.y) {
        const value = datum.yScale ? datum.yScale * datum.y : datum.y;
        addDetail(currentSeries.label, currentSeries.yAxisFormatter(value));
      }
      if (datum.z) {
        addDetail(currentSeries.zLabel, currentSeries.zAxisFormatter(datum.z));
      }
      if (datum.series && datum.parent) {
        const dimension = datum.parent;
        addDetail(dimension.title, datum.series);
      }
      if (datum.tableRaw) {
        addDetail(datum.tableRaw.title, datum.tableRaw.value);
      }

      $tooltipScope.$apply();
      return $tooltip[0].outerHTML;
    };
  };
}

let _tooltipFormatter;
export const getPointSeriesTooltipFormatter = () => {
  if (!_tooltipFormatter) {
    throw new Error('tooltip formatter not initialized');
  }
  return _tooltipFormatter;
};

export const initializePointSeriesTooltipFormatter = async () => {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const Private = $injector.get('Private');
  _tooltipFormatter = Private(PointSeriesTooltipFormatterProvider);
};

export const setPointSeriesTooltipFormatter = Private => {
  _tooltipFormatter = Private(PointSeriesTooltipFormatterProvider);
};
