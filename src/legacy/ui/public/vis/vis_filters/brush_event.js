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
import moment from 'moment';
import { buildRangeFilter } from '@kbn/es-query';
import { timefilter } from 'ui/timefilter';

export function onBrushEvent(event, $state) {
  const isNumber = event.data.ordered;
  const isDate = isNumber && event.data.ordered.date;

  const xRaw = _.get(event.data, 'series[0].values[0].xRaw');
  if (!xRaw) return;
  const column = xRaw.table.columns[xRaw.column];
  if (!column) return;
  const aggConfig = event.aggConfigs[xRaw.column];
  if (!aggConfig) return;
  const indexPattern = aggConfig.getIndexPattern();
  const field = aggConfig.params.field;
  if (!field) return;
  const fieldName = field.name;

  if (isDate && indexPattern.timeFieldName === fieldName) {
    setTimefilter();
  } else if (isNumber) {
    setRange();
  }

  function setTimefilter() {
    const from = moment(event.range[0]);
    const to = moment(event.range[1]);

    if (to - from === 0) return;

    timefilter.setTime({
      from,
      to,
      mode: 'absolute'
    });
  }

  function setRange() {
    if (event.range.length <= 1) return;

    const existingFilter = $state.filters.find(filter => (
      filter.meta && filter.meta.key === fieldName
    ));

    const min = event.range[0];
    const max = event.range[event.range.length - 1];
    let range;

    if (isDate) {
      range = {
        gte: moment(min).toISOString(),
        lt: moment(max).toISOString(),
        format: 'strict_date_optional_time'
      };
    } else {
      range = {
        gte: min,
        lt: max
      };
    }

    if (_.has(existingFilter, 'range')) {
      existingFilter.range[fieldName] = range;
    } else {
      const newFilter = buildRangeFilter(
        field,
        range,
        indexPattern,
        event.data.xAxisFormatter);
      if (existingFilter) {
        Object.assign(existingFilter, newFilter);
      } else {
        $state.$newFilters = [newFilter];
      }
    }
  }
}
