import { isValidTimeseriesMetric } from './check_timeseries_pipelines';
export function removeTimeseriesMetrics(series) {
  return series.map(item => {
    return {
      ...item,
      metrics: item.metrics.filter(metric => !isValidTimeseriesMetric(metric)),
    };
  });
}
