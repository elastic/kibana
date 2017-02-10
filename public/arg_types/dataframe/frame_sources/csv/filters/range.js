import _ from 'lodash';

export const range = (filter, rows) => {
  return _.filter(rows, row => {
    if (_.isUndefined(row[filter.column])) return true;
    return (
      (_.isUndefined(filter.gte) ? true : row[filter.column] >= filter.gte) &&
      (_.isUndefined(filter.gt)  ? true : row[filter.column] >  filter.gt) &&
      (_.isUndefined(filter.lt)  ? true : row[filter.column] <  filter.lt) &&
      (_.isUndefined(filter.lte) ? true : row[filter.column] <= filter.lte)
    );
  });
};
