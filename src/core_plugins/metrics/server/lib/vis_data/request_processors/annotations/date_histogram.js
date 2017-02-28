import _ from 'lodash';
import moment from 'moment';
import getBucketSize from '../../get_bucket_size';
import getTimerange from '../../get_timerange';
export default function dateHistogram(req, panel, annotation) {
  return next => doc => {
    const timeField = annotation.time_field;
    const { bucketSize, intervalString } = getBucketSize(req, 'auto');
    const { from, to } = getTimerange(req);
    _.set(doc, `aggs.${annotation.id}.date_histogram`, {
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

