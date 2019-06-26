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
const { set, get, isEmpty, forEach } = require('lodash');

const isEmptyFilter = (filter = {}) => Boolean(filter.match_all) && isEmpty(filter.match_all);

/* Last query handler in the chain. You can use this handler
 * as the last place where you can modify the "doc" (request body) object before sending it to ES.
 */
export function normalizeQuery() {
  return () => doc => {
    const series = get(doc, 'aggs.pivot.aggs');
    const normalizedSeries = {};

    forEach(series, (value, seriesId) => {
      const filter = get(value, `filter`);

      if (isEmptyFilter(filter)) {
        const agg = get(value, 'aggs.timeseries');
        const meta = {
          ...get(value, 'meta'),
          seriesId,
        };
        set(normalizedSeries, `${seriesId}`, agg);
        set(normalizedSeries, `${seriesId}.meta`, meta);
      } else {
        set(normalizedSeries, `${seriesId}`, value);
      }
    });

    set(doc, 'aggs.pivot.aggs', normalizedSeries);

    return doc;
  };
}
