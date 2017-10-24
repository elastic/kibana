import SeriesAgg from './_series_agg';
import _ from 'lodash';
import calculateLabel from '../../../../../common/calculate_label';
export default function seriesAgg(resp, panel, series) {
  return next => results => {
    if (series.aggregate_by && series.aggregate_function) {

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
      const fn = SeriesAgg[series.aggregate_function];
      const data = fn(targetSeries);
      results.push({
        id: `${series.id}`,
        label: series.label || calculateLabel(_.last(series.metrics), series.metrics),
        data: _.first(data),
      });
    }
    return next(results);
  };
}

