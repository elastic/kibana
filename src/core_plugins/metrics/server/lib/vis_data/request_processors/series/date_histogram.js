import getBucketSize from '../../helpers/get_bucket_size';
import offsetTime from '../../offset_time';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import { set } from 'lodash';
export default function dateHistogram(req, panel, series) {
  return next => doc => {
    const { timeField, interval } = getIntervalAndTimefield(panel, series);
    const { bucketSize, intervalString } = getBucketSize(req, interval);
    const { from, to }  = offsetTime(req, series.offset_time);
    const { timezone } = req.payload.timerange;

    set(doc, `aggs.${series.id}.aggs.timeseries.date_histogram`, {
      field: timeField,
      interval: intervalString,
      min_doc_count: 0,
      time_zone: timezone,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf()
      }
    });
    set(doc, `aggs.${series.id}.meta`, {
      timeField,
      intervalString,
      bucketSize
    });
    return next(doc);
  };
}
