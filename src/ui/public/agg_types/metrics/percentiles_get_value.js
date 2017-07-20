import { find } from 'lodash';

export function getPercentileValue(agg, bucket) {
  const values = bucket[agg.parentId] && bucket[agg.parentId].values;
  const percentile = find(values, value => agg.key === value.key);
  return percentile ? percentile.value : NaN;
}
