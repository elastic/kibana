import getDefaultDecoration from '../../helpers/get_default_decoration';
import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
import mapBucket from '../../helpers/map_bucket';
export default function stdMetric(resp, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.type === 'std_deviation' && metric.mode === 'band') {
      return next(results);
    }
    if (metric.type === 'percentile') {
      return next(results);
    }
    if (/_bucket$/.test(metric.type)) return next(results);
    const decoration = getDefaultDecoration(series);
    getSplits(resp, panel, series).forEach((split) => {
      const data = split.timeseries.buckets.map(mapBucket(metric));
      results.push({
        id: `${split.id}`,
        label: split.label,
        color: split.color,
        data,
        ...decoration
      });
    });
    return next(results);
  };
}

