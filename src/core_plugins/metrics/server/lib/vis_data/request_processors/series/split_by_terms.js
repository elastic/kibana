import _ from 'lodash';
import basicAggs from '../../../../../common/basic_aggs';
import getBucketsPath from '../../helpers/get_buckets_path';
import bucketTransform from '../../helpers/bucket_transform';

export default function splitByTerm(req, panel, series) {
  return next => doc => {
    if (series.split_mode === 'terms' && series.terms_field) {
      const direction = series.terms_direction || 'desc';
      _.set(doc, `aggs.${series.id}.terms.field`, series.terms_field);
      _.set(doc, `aggs.${series.id}.terms.size`, series.terms_size);
      const metric = series.metrics.find(item => item.id === series.terms_order_by);
      if (metric && metric.type !== 'count' && ~basicAggs.indexOf(metric.type)) {
        const sortAggKey = `${series.terms_order_by}-SORT`;
        const fn = bucketTransform[metric.type];
        const bucketPath = getBucketsPath(series.terms_order_by, series.metrics)
          .replace(series.terms_order_by, sortAggKey);
        _.set(doc, `aggs.${series.id}.terms.order`, { [bucketPath]: direction });
        _.set(doc, `aggs.${series.id}.aggs`, { [sortAggKey]: fn(metric) });
      } else if (['_term', '_count'].includes(series.terms_order_by)) {
        _.set(doc, `aggs.${series.id}.terms.order`, { [series.terms_order_by]: direction });
      } else {
        _.set(doc, `aggs.${series.id}.terms.order`, { _count: direction });
      }
    }
    return next(doc);
  };
}

