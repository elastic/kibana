import offsetTime from '../../offset_time';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
export default function query(req, panel, series) {
  return next => doc => {
    const { timeField } = getIntervalAndTimefield(panel, series);
    const { from, to } = offsetTime(req, series.offset_time);

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
          lte: to.valueOf(),
          format: 'epoch_millis',
        }
      }
    };
    doc.query.bool.must.push(timerange);

    const globalFilters = req.payload.filters;
    if (globalFilters && !panel.ignore_global_filter) {
      doc.query.bool.must = doc.query.bool.must.concat(globalFilters);
    }

    if (panel.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: panel.filter,
          analyze_wildcard: true
        }
      });
    }

    if (series.filter) {
      doc.query.bool.must.push({
        query_string: {
          query: series.filter,
          analyze_wildcard: true
        }
      });
    }

    return next(doc);

  };
}
