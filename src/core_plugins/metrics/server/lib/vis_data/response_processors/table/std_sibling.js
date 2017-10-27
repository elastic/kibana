import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
import getSiblingAggValue from '../../helpers/get_sibling_agg_value';
export default function stdSibling(bucket, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);

    if (!/_bucket$/.test(metric.type)) return next(results);
    if (metric.type === 'std_deviation_bucket' && metric.mode === 'band') return next(results);

    const fakeResp = { aggregations: bucket };
    getSplits(fakeResp, panel, series).forEach(split => {
      const data = split.timeseries.buckets.map(b => {
        return [b.key, getSiblingAggValue(split, metric)];
      });
      results.push({
        id: split.id,
        label: split.label,
        data,
      });
    });

    return next(results);
  };


}
