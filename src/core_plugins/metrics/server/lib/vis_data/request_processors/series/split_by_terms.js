import _ from 'lodash';
import basicAggs from '../../../../../common/basic_aggs';
import getBucketSize from '../../helpers/get_bucket_size';
import getTimerange from '../../helpers/get_timerange';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import getBucketsPath from '../../helpers/get_buckets_path';
import bucketTransform from '../../helpers/bucket_transform';

export default function splitByTerm(req, panel, series) {
  return next => doc => {
    if (series.split_mode === 'terms' && series.terms_field) {
      const { timeField, interval } = getIntervalAndTimefield(panel, series);
      const {
        bucketSize
      } = getBucketSize(req, interval);
      const {
        to
      }  = getTimerange(req);

      _.set(doc, `aggs.${series.id}.terms.field`, series.terms_field);
      _.set(doc, `aggs.${series.id}.terms.size`, series.terms_size);
      const metric = series.metrics.find(item => item.id === series.terms_order_by);
      if (metric && metric.type !== 'count' && ~basicAggs.indexOf(metric.type)) {
        const sortAggKey = `${series.terms_order_by}-SORT`;
        const fn = bucketTransform[metric.type];
        const bucketPath = getBucketsPath(series.terms_order_by, series.metrics)
          .replace(series.terms_order_by, `${sortAggKey} > SORT`);
        _.set(doc, `aggs.${series.id}.terms.order`, { [bucketPath]: 'desc' });
        _.set(doc, `aggs.${series.id}.aggs`, {
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
      }
    }
    return next(doc);
  };
}

