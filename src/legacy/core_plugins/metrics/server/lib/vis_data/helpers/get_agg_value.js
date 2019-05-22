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

import { get, includes, max, min, sum, noop } from 'lodash';
import { toPercentileNumber } from '../../../../common/to_percentile_number';
import { EXTENDED_STATS_TYPES, METRIC_TYPES } from '../../../../common/metric_types';

const aggFns = {
  max,
  min,
  sum,
  noop,
  concat: values => values.join(', '),
  avg: values => sum(values) / values.length,
};

export default (row, metric) => {
  // Extended Stats
  if (includes(EXTENDED_STATS_TYPES, metric.type)) {
    const isStdDeviation = /^std_deviation/.test(metric.type);
    const modeIsBounds = ~['upper', 'lower'].indexOf(metric.mode);
    if (isStdDeviation && modeIsBounds) {
      return get(row, `${metric.id}.std_deviation_bounds.${metric.mode}`);
    }
    return get(row, `${metric.id}.${metric.type}`);
  }

  switch (metric.type) {
    case METRIC_TYPES.PERCENTILE:
      const percentileKey = toPercentileNumber(`${metric.percent}`);

      return row[metric.id].values[percentileKey];
    case METRIC_TYPES.PERCENTILE_RANK:
      const percentileRankKey = toPercentileNumber(`${metric.value}`);

      return (
        row[metric.id] &&
        row[metric.id].values &&
        row[metric.id].values[percentileRankKey]
      );
    case METRIC_TYPES.TOP_HIT:
      if (row[metric.id].doc_count === 0) {
        return null;
      }

      const hits = get(row, [metric.id, 'docs', 'hits', 'hits'], []);
      const values = hits.map(doc => get(doc, `_source.${metric.field}`));
      const aggWith = (metric.agg_with && aggFns[metric.agg_with]) || aggFns.noop;

      return aggWith(values);
    case METRIC_TYPES.COUNT:
      return get(row, 'doc_count', null);
    default:
      // Derivatives
      const normalizedValue = get(row, `${metric.id}.normalized_value`, null);

      // Everything else
      const value = get(row, `${metric.id}.value`, null);
      return normalizedValue || value;
  }
};
