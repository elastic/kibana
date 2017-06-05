import SeriesAgg from './_series_agg';
import _ from 'lodash';
import getDefaultDecoration from '../../helpers/get_default_decoration';
import calculateLabel from '../../../../../common/calculate_label';
export default function seriesAgg(resp, panel, series) {
  return next => results => {
    if (series.metrics.some(m => m.type === 'series_agg')) {
      const decoration = getDefaultDecoration(series);

      const targetSeries = [];
      // Filter out the seires with the matching metric and store them
      // in targetSeries
      results = results.filter(s => {
        if (s.id.split(/:/)[0] === series.id) {
          targetSeries.push(s.data);
          return false;
        }
        return true;
      });
      const data = series.metrics.filter(m => m.type === 'series_agg')
        .reduce((acc, m) => {
          const fn = SeriesAgg[m.function];
          return fn && fn(acc) || acc;
        }, targetSeries);
      results.push({
        id: `${series.id}`,
        label: series.label || calculateLabel(_.last(series.metrics), series.metrics),
        color: series.color,
        data: _.first(data),
        ...decoration
      });
    }
    return next(results);
  };
}

