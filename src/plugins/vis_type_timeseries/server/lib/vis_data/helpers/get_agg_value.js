/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, includes, max, min, sum, noop } from 'lodash';
import { toPercentileNumber } from '../../../../common/to_percentile_number';
import { METRIC_TYPES, EXTENDED_STATS_TYPES } from '../../../../common/enums';

const aggFns = {
  max,
  min,
  sum,
  noop,
  concat: (values) => values.join(', '),
  avg: (values) => sum(values) / values.length,
};

export const getAggValue = (row, metric) => {
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

      return row[metric.id] && row[metric.id].values && row[metric.id].values[percentileRankKey];
    case METRIC_TYPES.TOP_HIT:
      if (row[metric.id].doc_count === 0) {
        return null;
      }

      const hits = get(row, [metric.id, 'docs', 'hits', 'hits'], []);
      const values = hits.map((doc) => get(doc, `_source.${metric.field}`));
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
