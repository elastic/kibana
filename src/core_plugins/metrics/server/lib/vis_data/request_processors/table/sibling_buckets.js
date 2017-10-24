import _ from 'lodash';
import getBucketSize from '../../helpers/get_bucket_size';
import bucketTransform from '../../helpers/bucket_transform';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import { calculateAggRoot } from './calculate_agg_root';
export default function siblingBuckets(req, panel) {
  return next => doc => {
    const { interval } = getIntervalAndTimefield(panel);
    const { bucketSize } = getBucketSize(req, interval);
    panel.series.forEach(column => {
      const aggRoot = calculateAggRoot(doc, column);
      column.metrics
        .filter(row => /_bucket$/.test(row.type))
        .forEach(metric => {
          const fn = bucketTransform[metric.type];
          if (fn) {
            try {
              const bucket = fn(metric, column.metrics, bucketSize);
              _.set(doc, `${aggRoot}.${metric.id}`, bucket);
            } catch (e) {
              // meh
            }
          }
        });
    });
    return next(doc);
  };
}
