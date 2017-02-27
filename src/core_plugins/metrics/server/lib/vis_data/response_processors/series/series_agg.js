import SeriesAgg from '../../series_agg';
import _ from 'lodash';
import basicAggs from '../../../../../public/components/lib/basic_aggs';
import getDefaultDecoration from '../../get_default_decoration';
import getSplits from '../../get_splits';
import getLastMetric from '../../get_last_metric';
import mapBucket from '../../map_bucket';
import unitToSeconds from '../../../unit_to_seconds';
import calculateLabel from '../../../../../public/components/lib/calculate_label';
export default function seriesAgg(resp, panel, series) {
  return next => results => {
    if (series.metrics.some(m => m.type === 'series_agg')) {
      const decoration = getDefaultDecoration(series);
      const metric = getLastMetric(series);

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

