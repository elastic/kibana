import getBucketSize from '../../helpers/get_bucket_size';
import offsetTime from '../../offset_time';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import { overwrite } from '../../helpers';
export default function dateHistogram(req, panel, series) {
  return next => doc => {
    const { timeField, interval } = getIntervalAndTimefield(panel, series);
    const { intervalString } = getBucketSize(req, interval);
    const { from, to }  = offsetTime(req, series.offset_time);

    overwrite(doc, `aggs.${series.id}.aggs.timeseries.date_histogram`, {
      field: timeField,
      interval: intervalString,
      min_doc_count: 0,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf()
      }
    });
    return next(doc);
  };
}
