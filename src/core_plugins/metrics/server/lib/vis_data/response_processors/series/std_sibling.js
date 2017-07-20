import getDefaultDecoration from '../../helpers/get_default_decoration';
import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
import getSiblingAggValue from '../../helpers/get_sibling_agg_value';
export default function stdSibling(resp, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);

    if (!/_bucket$/.test(metric.type)) return next(results);
    if (metric.type === 'std_deviation_bucket' && metric.mode === 'band') return next(results);

    const decoration = getDefaultDecoration(series);
    getSplits(resp, panel, series).forEach((split) => {
      const data = split.timeseries.buckets.map(bucket => {
        return [bucket.key, getSiblingAggValue(split, metric)];
      });
      results.push({
        id: split.id,
        label: split.label,
        color: split.color,
        data,
        ...decoration
      });
    });
    return next(results);
  };


}
