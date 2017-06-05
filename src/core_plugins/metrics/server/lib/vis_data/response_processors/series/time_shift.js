import _ from 'lodash';
import moment from 'moment';
export default function timeShift(resp, panel, series) {
  return next => results => {
    if (/^([\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([\d]+)([shmdwMy]|ms)$/);
      if (matches) {
        const offsetValue = matches[1];
        const offsetUnit = matches[2];
        results.forEach(item => {
          if (_.startsWith(item.id, series.id)) {
            item.data = item.data.map(row => [moment(row[0]).add(offsetValue, offsetUnit).valueOf(), row[1]]);
          }
        });
      }
    }
    return next(results);
  };
}
