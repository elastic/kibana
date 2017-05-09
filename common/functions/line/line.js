const Fn = require('../fn.js');
const _ = require('lodash');

module.exports = new Fn({
  name: 'line',
  aliases: [],
  type: 'render',
  help: 'Produces a line chart',
  context: {
    types: [
      'cartesian',
    ],
  },
  args: {},
  fn: (context) => {
    const data = _.map(_.groupBy(context.rows, 'color'), (series, label) => {
      return {
        label: label,
        data: _.map(series, point => [point.x, point.y, point.size]),
      };
    });

    return {
      type: 'render',
      as: 'flot',
      data: data,
      options: {
        xaxis: {
          mode: context.columns.x.type === 'date' ? 'time' : null,
        },
        series: {
          lines: {
            lineWidth: 4,
          },
          shadowSize: 0,
        },
      },
    };
  },
});
