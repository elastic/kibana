import _ from 'lodash';
export default (row, metric) => {
  let key = metric.type.replace(/_bucket$/, '');
  if (key === 'std_deviation' && _.includes(['upper', 'lower'], metric.mode)) {
    key = `std_deviation_bounds.${metric.mode}`;
  }
  return _.get(row, `${metric.id}.${key}`);
};
