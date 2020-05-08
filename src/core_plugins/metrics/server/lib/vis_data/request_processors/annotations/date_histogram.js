import { overwrite } from '../../helpers';
import getBucketSize from '../../helpers/get_bucket_size';
import getTimerange from '../../helpers/get_timerange';
export default function dateHistogram(req, panel, annotation) {
  return next => doc => {
    const timeField = annotation.time_field;
    const { bucketSize, intervalString } = getBucketSize(req, 'auto');
    const { from, to } = getTimerange(req);
    const { timezone } = req.payload.timerange;
    overwrite(doc, `aggs.${annotation.id}.date_histogram`, {
      field: timeField,
      interval: intervalString,
      min_doc_count: 0,
      time_zone: timezone,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf() - (bucketSize * 1000)
      }
    });
    return next(doc);
  };
}
