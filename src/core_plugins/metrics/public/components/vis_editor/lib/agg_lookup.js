import _ from 'lodash';
const lookup = {
  'count': 'Count',
  'calculation': 'Calculation',
  'std_deviation': 'Std. Deviation',
  'variance': 'Variance',
  'sum_of_squares': 'Sum of Sq.',
  'avg': 'Average',
  'max': 'Max',
  'min': 'Min',
  'sum': 'Sum',
  'percentile': 'Percentile',
  'cardinality': 'Cardinality',
  'value_count': 'Value Count',
  'derivative': 'Derivative',
  'cumulative_sum': 'Cumulative Sum',
  'moving_average': 'Moving Average',
  'avg_bucket': 'Overall Average',
  'min_bucket': 'Overall Min',
  'max_bucket': 'Overall Max',
  'sum_bucket': 'Overall Sum',
  'variance_bucket': 'Overall Variance',
  'sum_of_squares_bucket': 'Overall Sum of Sq.',
  'std_deviation_bucket': 'Overall Std. Deviation',
  'series_agg': 'Series Agg'
};

const pipeline = [
  'calculation',
  'derivative',
  'cumulative_sum',
  'moving_average',
  'avg_bucket',
  'min_bucket',
  'max_bucket',
  'sum_bucket',
  'variance_bucket',
  'sum_of_squares_bucket',
  'std_deviation_bucket',
  'series_agg'
];

const byType = {
  _all: lookup,
  pipeline: pipeline,
  top_10: _.omit(lookup, pipeline)
};

export function isBasicAgg(item) {
  return _.includes(Object.keys(byType.top_10), item.type);
}

export function createOptions(type = '_all', siblings = []) {
  let aggs = byType[type];
  if (!aggs)  aggs = byType._all;
  return _(aggs)
    .map((label, value) => {
      const disabled = false;
      return { label, value, disabled };
    })
    .sortBy('label')
    .value();
}
export default lookup;

