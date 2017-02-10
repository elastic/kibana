import _ from 'lodash';

export const exactly = (filter, rows) => {
  return _.filter(rows, row => {
    return row[filter.column] === filter.value;
  });
};
