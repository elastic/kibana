import { get, set, last } from 'lodash';

import basicAggs from '../../../../../common/basic_aggs';
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
        const metric = series && last(series.metrics);
        if (metric && metric.type === 'count') {
          set(doc, 'aggs.pivot.terms.order', { _count: sort.order });
        } else if (metric && basicAggs.includes(metric.type)) {
          const sortAggKey = `${metric.id}-SORT`;
          const fn = bucketTransform[metric.type];
          const bucketPath = getBucketsPath(metric.id, series.metrics)
            .replace(metric.id, sortAggKey);
          set(doc, `aggs.pivot.terms.order`, { [bucketPath]: sort.order });
          set(doc, `aggs.pivot.aggs`, { [sortAggKey]: fn(metric) });
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
