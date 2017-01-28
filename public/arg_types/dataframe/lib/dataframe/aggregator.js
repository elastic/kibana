import _ from 'lodash';

export const aggregator = (init) => {
  const aggregate = (data, field, fn, initial) => {
    if (_.isPlainObject(data)) {
      return _.mapValues(data, rows => {
        return _.reduce(rows, fn, initial);
      });
    }

    if (_.isArray(data)) {
      return _.reduce(data, fn, initial);
    }
  };

  const last = (data, field) => aggregate(data, field, (acc, row) => row[field]);
  const sum = (data, field) => aggregate(data, field, (acc, row) => acc + row[field], 0);
  const min = (data, field) => aggregate(data, field, (acc, row) => {
    if (acc == null) return row[field];
    else return (row[field] < acc ? row[field] : acc);
  });
  const max = (data, field) => aggregate(data, field, (acc, row) => {
    if (acc == null) return row[field];
    else return (row[field] > acc ? row[field] : acc);
  });
  const avg = (data, field) => aggregate(data, field, (acc, row, i, p) => acc + row[field] / p.length, 0);


  const by = (data, ...cols) => {
    const kv = _.groupBy(data, (row) =>
      _.map(cols, (col) => row[col]).join(' '));

    return {
      value: _.partial(last, kv), // TODO: figure out a better way to get the value of a column
      last: _.partial(last, kv),
      sum: _.partial(sum, kv),
      avg: _.partial(avg, kv),
      min: _.partial(min, kv),
      max: _.partial(max, kv)
    };
  };

  return {
    by: _.partial(by, init),
    value: _.partial(last, init), // TODO: figure out a better way to get the value of a column
    last: _.partial(last, init),
    sum: _.partial(sum, init),
    avg: _.partial(avg, init),
    min: _.partial(min, init),
    max: _.partial(max, init)
  };
};
