import getBucketSize from '../../helpers/get_bucket_size';
import getTimerange from '../../helpers/get_timerange';
export default function query(req, panel, annotation) {
  return next => doc => {
    const timeField = annotation.time_field;
    const {
      bucketSize
    } = getBucketSize(req, 'auto');
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

    const globalFilters = req.payload.filters;
    if (!annotation.ignore_global_filters) {
      doc.query.bool.must = doc.query.bool.must.concat(globalFilters);
    }

    if (!annotation.ignore_panel_filters && panel.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: panel.filter,
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

