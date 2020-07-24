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

export const UI_RESTRICTIONS = { '*': true };
export const INDEX_PATTERN = 'some-pattern';
export const FIELDS = {
  [INDEX_PATTERN]: [
    {
      type: 'date',
      name: '@timestamp',
    },
    {
      type: 'number',
      name: 'system.cpu.user.pct',
    },
    {
      type: 'histogram',
      name: 'histogram_value',
    },
  ],
};
export const METRIC = {
  id: 'sample_metric',
  type: 'avg',
  field: 'system.cpu.user.pct',
};
export const SERIES = {
  metrics: [METRIC],
};
export const PANEL = {
  type: 'timeseries',
  index_pattern: INDEX_PATTERN,
  series: SERIES,
};
