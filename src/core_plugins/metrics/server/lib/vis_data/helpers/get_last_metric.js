import _ from 'lodash';
export default function getLastMetric(series) {
  return _.last(series.metrics.filter(s => s.type !== 'series_agg'));

}

