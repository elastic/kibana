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
import { buildEsQuery } from '@kbn/es-query';
import { getTimerange } from '../../helpers/get_timerange';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';

export function query(req, panel, esQueryConfig, indexPatternObject) {
  return next => doc => {
    const { timeField } = getIntervalAndTimefield(panel, {}, indexPatternObject);
    const { from, to } = getTimerange(req);

    doc.size = 0;

    const queries = !panel.ignore_global_filter ? req.payload.query : [];
    const filters = !panel.ignore_global_filter ? req.payload.filters : [];
    doc.query = buildEsQuery(indexPatternObject, queries, filters, esQueryConfig);

    const timerange = {
      range: {
        [timeField]: {
          gte: from.toISOString(),
          lte: to.toISOString(),
          format: 'strict_date_optional_time',
        },
      },
    };
    doc.query.bool.must.push(timerange);

    if (panel.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: panel.filter,
          analyze_wildcard: true,
        },
      });
    }

    return next(doc);
  };
}
