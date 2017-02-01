import Color from 'color';
import calculateLabel from '../../../public/components/lib/calculate_label';
import _ from 'lodash';
import getLastMetric from './get_last_metric';
import getSplitColors from './get_split_colors';
export default function getSplits(resp, series) {
  const metric = getLastMetric(series);
  if (_.has(resp, `aggregations.${series.id}.buckets`)) {
    const size = _.get(resp, `aggregations.${series.id}.buckets`).length;
    const colors = getSplitColors(series.color, size, series.split_color_mode);
    return _.get(resp, `aggregations.${series.id}.buckets`).map(bucket => {
      bucket.id = `${series.id}:${bucket.key}`;
      bucket.label = bucket.key;
      bucket.color = colors.shift();
      return bucket;
    });
  }

  const color = new Color(series.color);
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
      color: color.hex(),
      ...mergeObj
    }
  ];
}


