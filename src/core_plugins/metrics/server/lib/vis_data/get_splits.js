import Color from 'color';
import calculateLabel from '../../../public/components/lib/calculate_label';
import _ from 'lodash';
import getLastMetric from './get_last_metric';
export default function getSplits(resp, series) {
  const color = new Color(series.color);
  const metric = getLastMetric(series);
  if (_.has(resp, `aggregations.${series.id}.buckets`)) {
    return _.get(resp, `aggregations.${series.id}.buckets`).map(bucket => {
      bucket.id = `${series.id}:${bucket.key}`;
      bucket.label = bucket.key;
      bucket.color = color.hexString();
      color.darken(0.1);
      return bucket;
    });
  }
  const timeseries = _.get(resp, `aggregations.${series.id}.timeseries`);
  const mergeObj = {
    timeseries
  };
  series.metrics
    .filter(m => /_bucket/.test(m.type))
    .forEach(m => {
      mergeObj[m.id] = _.get(resp, `aggregations.${series.id}.${m.id}`);
    });
  return [
    {
      id: series.id,
      label: series.label || calculateLabel(metric, series.metrics),
      color: color.hexString(),
      ...mergeObj
    }
  ];
}


