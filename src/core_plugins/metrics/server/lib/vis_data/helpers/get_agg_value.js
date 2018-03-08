import { get, includes, max, min, sum } from 'lodash';
import extendStatsTypes from './extended_stats_types';

const aggFns = {
  max,
  min,
  sum,
  avg: values => sum(values) / values.length,
};

export default (row, metric) => {
  // Extended Stats
  if (includes(extendStatsTypes, metric.type)) {
    const isStdDeviation = /^std_deviation/.test(metric.type);
    const modeIsBounds = ~['upper', 'lower'].indexOf(metric.mode);
    if (isStdDeviation && modeIsBounds) {
      return get(row, `${metric.id}.std_deviation_bounds.${metric.mode}`);
    }
    return get(row, `${metric.id}.${metric.type}`);
  }

  // Percentiles
  if (metric.type === 'percentile') {
    let percentileKey = `${metric.percent}`;
    if (!/\./.test(`${metric.percent}`)) {
      percentileKey = `${metric.percent}.0`;
    }
    return row[metric.id].values[percentileKey];
  }

  if (metric.type === 'percentile_rank') {
    const percentileRankKey = `${metric.value}`;
    return (
      row[metric.id] &&
      row[metric.id].values &&
      row[metric.id].values[percentileRankKey]
    );
  }

  if (metric.type === 'top_hit') {
    if (row[metric.id].doc_count === 0) return null;
    const hits = get(row, [metric.id, 'docs', 'hits', 'hits'], []);
    const values = hits.map(doc => {
      return get(doc, `_source.${metric.field}`, 0);
    });
    const aggWith = (metric.agg_with && aggFns[metric.agg_with]) || aggFns.avg;
    return aggWith(values);
  }

  // Derivatives
  const normalizedValue = get(row, `${metric.id}.normalized_value`, null);

  // Everything else
  const value = get(row, `${metric.id}.value`, null);
  return normalizedValue || value;
};
