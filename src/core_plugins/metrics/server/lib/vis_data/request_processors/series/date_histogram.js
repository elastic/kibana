import _ from 'lodash';
import getBucketSize from '../../helpers/get_bucket_size';
import offsetTime from '../../offset_time';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
export default function dateHistogram(req, panel, series) {
  return next => doc => {
    const { timeField, interval } = getIntervalAndTimefield(panel, series);
    const { bucketSize, intervalString } = getBucketSize(req, interval);
    const { from, to }  = offsetTime(req, series.offset_time);
    _.set(doc, `aggs.${series.id}.aggs.timeseries.date_histogram`, {
      field: timeField,
      interval: intervalString,
      min_doc_count: 0,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf() - (bucketSize * 1000)
      }
    });
    return next(doc);
  };
}
