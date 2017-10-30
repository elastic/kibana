import basicAggs from '../../../../common/basic_aggs';
export function isSortable(metric) {
  return basicAggs.includes(metric.type);
}
