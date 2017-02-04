import _ from 'lodash';
import unitToSeconds from '../../../unit_to_seconds';
export default function timeShift(resp, panel, series) {
  return next => results => {
    if (/^([\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([\d]+)([shmdwMy]|ms)$/);
      if (matches) {
        const offsetSeconds = Number(matches[1]) * unitToSeconds(matches[2]);
        results.forEach(item => {
          if (_.startsWith(item.id, series.id)) {
            item.data = item.data.map(row => [row[0] + (offsetSeconds * 1000), row[1]]);
          }
        });
      }
    }
    return next(results);
  };
}
