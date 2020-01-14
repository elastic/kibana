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
import { esFilters } from '../../../../../../../plugins/data/public';

export function onBrushEvent(event) {
  const isNumber = event.data.ordered;
  const isDate = isNumber && event.data.ordered.date;

  const xRaw = _.get(event.data, 'series[0].values[0].xRaw');
  if (!xRaw) return [];
  const column = xRaw.table.columns[xRaw.column];
  if (!column) return [];
  const aggConfig = event.aggConfigs[xRaw.column];
  if (!aggConfig) return [];
  const indexPattern = aggConfig.getIndexPattern();
  const field = aggConfig.params.field;
  if (!field) return [];

  if (event.range.length <= 1) return [];

  const min = event.range[0];
  const max = event.range[event.range.length - 1];
  if (min === max) return [];

  let range;

  if (isDate) {
    range = {
      gte: moment(min).toISOString(),
      lt: moment(max).toISOString(),
      format: 'strict_date_optional_time',
    };
  } else {
    range = {
      gte: min,
      lt: max,
    };
  }

  const newFilter = esFilters.buildRangeFilter(
    field,
    range,
    indexPattern,
    event.data.xAxisFormatter
  );

  return [newFilter];
}
