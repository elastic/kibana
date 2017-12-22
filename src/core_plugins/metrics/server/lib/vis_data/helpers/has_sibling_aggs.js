export function hasSiblingAggs(series) {
  return series.metrics.some(
    metric => /_bucket$/.test(metric.type)
  );
}

