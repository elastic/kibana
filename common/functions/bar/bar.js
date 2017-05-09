const Fn = require('../fn.js');
import { groupBy } from 'lodash';

module.exports = new Fn({
  name: 'bar',
  type: 'flot',
  help: 'Produces a bar chart',
  context: {
    types: ['cartesian'],
  },
  args: {
    stack: {
      types: ['boolean'],
    },
  },
  fn: (context, args) => {
    const data = groupBy(context.rows, 'color').map((series, label) => {
      return {
        label: label,
        stack: args.stack,
        bars: { show: true },
        data: series.map(point => [point.x, point.y, point.size]),
      };
    });

    return {
      type: 'flot',
      data: data,
      options: {
        xaxis: {
          mode: context.columns.x.type === 'date' ? 'time' : null,
        },
      },
    };
  },
});
