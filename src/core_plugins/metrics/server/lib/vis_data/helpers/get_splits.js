import Color from 'color';
import calculateLabel from '../../../../common/calculate_label';
import _ from 'lodash';
import getLastMetric from './get_last_metric';
import getSplitColors from './get_split_colors';
import { formatKey } from './format_key';
export default function getSplits(resp, panel, series) {
  const color = new Color(series.color);
  const metric = getLastMetric(series);
  if (_.has(resp, `aggregations.${series.id}.buckets`)) {
    const buckets = _.get(resp, `aggregations.${series.id}.buckets`);
    if (_.isArray(buckets)) {
      const size = buckets.length;
      const colors = getSplitColors(series.color, size, series.split_color_mode);
      return buckets.map(bucket => {
        bucket.id = `${series.id}:${bucket.key}`;
        bucket.label = formatKey(bucket.key, series);
        bucket.color = panel.type === 'top_n' ? color.hex() : colors.shift();
        return bucket;
      });
    }

    if(series.split_mode === 'filters' && _.isPlainObject(buckets)) {
      return series.split_filters.map(filter => {
        const bucket = _.get(resp, `aggregations.${series.id}.buckets.${filter.id}`);
        bucket.id = `${series.id}:${filter.id}`;
        bucket.key = filter.id;
        bucket.color = filter.color;
        bucket.label = filter.label || filter.filter || '*';
        return bucket;
      });
    }
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
      color: color.hex(),
      ...mergeObj
    }
  ];
}


