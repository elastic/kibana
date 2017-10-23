import { get, set, last } from 'lodash';

import basicAggs from '../../../../../common/basic_aggs';
import getBucketSize from '../../helpers/get_bucket_size';
import getTimerange from '../../helpers/get_timerange';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import getBucketsPath from '../../helpers/get_buckets_path';
import bucketTransform from '../../helpers/bucket_transform';

export default function pivot(req, panel) {
  return next => doc => {
    const { sort } = req.payload.state;
    if (panel.pivot_id) {
      set(doc, 'aggs.pivot.terms.field', panel.pivot_id);
      set(doc, 'aggs.pivot.terms.size', panel.pivot_rows);
      if (sort) {
        const series = panel.series.find(item => item.id === sort.column);
        const { timeField, interval } = getIntervalAndTimefield(panel, series);
        const { bucketSize } = getBucketSize(req, interval);
        const { to }  = getTimerange(req);
        const metric = series && last(series.metrics);
        if (metric && metric.type === 'count') {
          set(doc, 'aggs.pivot.terms.order', { _count: sort.order });
        } else if (metric && basicAggs.includes(metric.type)) {
          const sortAggKey = `${metric.id}-SORT`;
          const fn = bucketTransform[metric.type];
          const bucketPath = getBucketsPath(metric.id, series.metrics)
            .replace(metric.id, `${sortAggKey} > SORT`);
          set(doc, `aggs.pivot.terms.order`, { [bucketPath]: sort.order });
          set(doc, `aggs.pivot.aggs`, {
            [sortAggKey]: {
              filter: {
                range: {
                  [timeField]: {
                    gte: to.valueOf() - (bucketSize * 1500),
                    lte: to.valueOf(),
                    format: 'epoch_millis'
                  }
                }
              },
              aggs: { SORT: fn(metric) }
            }
          });
        } else {
          set(doc, 'aggs.pivot.terms.order', { _term: get(sort, 'order', 'asc') });
        }
      }
    } else {
      set(doc, 'aggs.pivot.filter.match_all', {});
    }
    return next(doc);
  };
}
