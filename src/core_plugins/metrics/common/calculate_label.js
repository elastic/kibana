import _ from 'lodash';
import lookup from './agg_lookup';
const paths = [
  'cumulative_sum',
  'derivative',
  'moving_average',
  'avg_bucket',
  'sum_bucket',
  'min_bucket',
  'max_bucket',
  'std_deviation_bucket',
  'variance_bucket',
  'sum_of_squares_bucket',
  'serial_diff',
  'positive_only'
];
export default function calculateLabel(metric, metrics) {
  if (!metric) return 'Unknown';
  if (metric.alias) return metric.alias;

  if (metric.type === 'count') return 'Count';
  if (metric.type === 'calculation') return 'Calculation';
  if (metric.type === 'series_agg') return `Series Agg (${metric.function})`;
  if (metric.type === 'filter_ratio') return 'Filter Ratio';
  if (metric.type === 'static') return `Static Value of ${metric.value}`;

  if (metric.type === 'percentile_rank') {
    return `${lookup[metric.type]} (${metric.value}) of ${metric.field}`;
  }

  if (_.includes(paths, metric.type)) {
    const targetMetric = _.find(metrics, { id: metric.field });
    const targetLabel = calculateLabel(targetMetric, metrics);
    return `${lookup[metric.type]} of ${targetLabel}`;
  }

  return `${lookup[metric.type]} of ${metric.field}`;
}

