import _ from 'lodash';
import getAggValue from '../../helpers/get_agg_value';
import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
export default function percentile(resp, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.type !== 'percentile') return next(results);

    getSplits(resp, panel, series).forEach((split) => {
      const label = (split.label) + ` (${series.value})`;
      const data = split.timeseries.buckets.map(bucket => {
        const m = _.assign({}, metric, { percent: series.value });
        return [bucket.key, getAggValue(bucket, m)];
      });
      results.push({
        id: `${percentile.id}:${split.id}`,
        label,
        data,
      });

    });
    return next(results);
  };
}
