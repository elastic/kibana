import _ from 'lodash';
import getBucketSize from '../../helpers/get_bucket_size';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import getTimerange from '../../helpers/get_timerange';
import { calculateAggRoot } from './calculate_agg_root';

export default function dateHistogram(req, panel) {
  return next => doc => {
    const { timeField, interval } = getIntervalAndTimefield(panel);
    const { intervalString } = getBucketSize(req, interval);
    const { from, to }  = getTimerange(req);
    panel.series.forEach(column => {
      const aggRoot = calculateAggRoot(doc, column);
      _.set(doc, `${aggRoot}.timeseries.date_histogram`, {
        field: timeField,
        interval: intervalString,
        min_doc_count: 0,
        extended_bounds: {
          min: from.valueOf(),
          max: to.valueOf()
        }
      });
    });
    return next(doc);
  };
}
