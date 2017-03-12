import _ from 'lodash';
import moment from 'moment';
import getBucketSize from '../../helpers/get_bucket_size';
import getTimerange from '../../helpers/get_timerange';
export default function query(req, panel, annotation) {
  return next => doc => {
    const timeField = annotation.time_field;
    const { bucketSize, intervalString } = getBucketSize(req, 'auto');
    const { from, to } = getTimerange(req);

    doc.size = 0;
    doc.query = {
      bool: {
        must: []
      }
    };

    const timerange = {
      range: {
        [timeField]: {
          gte: from.valueOf(),
          lte: to.valueOf() - (bucketSize * 1000),
          format: 'epoch_millis',
        }
      }
    };
    doc.query.bool.must.push(timerange);

    if (annotation.query_string) {
      doc.query.bool.must.push({
        query_string: {
          query: annotation.query_string,
          analyze_wildcard: true
        }
      });
    }

    if (annotation.fields) {
      const fields = annotation.fields.split(/[,\s]+/) || [];
      fields.forEach(field => {
        doc.query.bool.must.push({ exists: { field } });
      });
    }

    return next(doc);

  };
}

