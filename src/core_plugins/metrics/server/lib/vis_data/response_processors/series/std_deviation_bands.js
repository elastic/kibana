import _ from 'lodash';
import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
import mapBucket from '../../helpers/map_bucket';
export default function stdDeviationBands(resp, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.type === 'std_deviation' && metric.mode === 'band') {
      getSplits(resp, panel, series).forEach((split) => {
        const upper = split.timeseries.buckets.map(mapBucket(_.assign({}, metric, { mode: 'upper' })));
        const lower = split.timeseries.buckets.map(mapBucket(_.assign({}, metric, { mode: 'lower' })));
        results.push({
          id: `${split.id}:upper`,
          label: split.label,
          color: split.color,
          lines: { show: true, fill: 0.5, lineWidth: 0 },
          points: { show: false },
          fillBetween: `${split.id}:lower`,
          data: upper
        });
        results.push({
          id: `${split.id}:lower`,
          color: split.color,
          lines: { show: true, fill: false, lineWidth: 0 },
          points: { show: false },
          data: lower
        });
      });
    }
    return next(results);
  };

}
