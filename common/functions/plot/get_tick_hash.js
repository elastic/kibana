import { get, sortBy } from 'lodash';

export const getTickHash = (columns, rows) => {
  const ticks = {
    x: {
      hash: {},
      counter: 0,
    },
    y: {
      hash: {},
      counter: 0,
    },
  };

  if (get(columns, 'x.type') === 'string') {
    sortBy(rows, ['x']).forEach(row => {
      if (!ticks.x.hash[row.x]) {
        ticks.x.hash[row.x] = ticks.x.counter++;
      }
    });
  }

  if (get(columns, 'y.type') === 'string') {
    sortBy(rows, ['y'])
      .reverse()
      .forEach(row => {
        if (!ticks.y.hash[row.y]) {
          ticks.y.hash[row.y] = ticks.y.counter++;
        }
      });
  }

  return ticks;
};
