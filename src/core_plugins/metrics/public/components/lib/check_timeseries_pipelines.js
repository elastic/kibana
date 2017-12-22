export const timeseriesPipelineAggs = [
  'cumulative_sum',
  'derivative',
  'moving_average',
  'positive_only',
  'serial_diff',
  'series_agg',
];

export function isValidTimeseriesMetric(metric) {
  return (
    /_bucket$/.test(metric.type) || timeseriesPipelineAggs.includes(metric.type)
  );
}

export function hasPipelineAggregation(series) {
  return series.metrics.some(isValidTimeseriesMetric);
}
