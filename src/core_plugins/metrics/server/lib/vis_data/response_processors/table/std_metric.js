import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
import mapBucket from '../../helpers/map_bucket';
export default function stdMetric(bucket, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.type === 'std_deviation' && metric.mode === 'band') {
      return next(results);
    }
    if (metric.type === 'percentile') {
      return next(results);
    }
    if (/_bucket$/.test(metric.type)) return next(results);

    const fakeResp = { aggregations: bucket };
    getSplits(fakeResp, panel, series).forEach(split => {
      const data = split.timeseries.buckets.map(mapBucket(metric));
      results.push({
        id: split.id,
        label: split.label,
        data,
      });
    });

    return next(results);
  };
}

