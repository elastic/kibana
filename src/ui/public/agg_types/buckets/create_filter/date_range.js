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

import chrome from 'ui/chrome';
import { dateRange } from '../../../utils/date_range';
import { buildRangeFilter } from '@kbn/es-query';

const config = chrome.getUiSettingsClient();

export function createFilterDateRange(agg, key) {
  const range = dateRange.parse(key, config.get('dateFormat'));

  const filter = {};
  if (range.from) filter.gte = +range.from;
  if (range.to) filter.lt = +range.to;
  if (range.to && range.from) filter.format = 'epoch_millis';

  return buildRangeFilter(agg.params.field, filter, agg.getIndexPattern());
}
