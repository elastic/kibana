import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
module.exports = new Chainable('legend', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'position',
      types: ['string', 'boolean', 'null'],
      help: 'Corner to place the legend in: nw, ne, se, or sw. You can also pass false to disable the legend'
    },
    {
      name: 'columns',
      types: ['number', 'null'],
      help: 'Number of columns to divide the legend into'
    },
  ],
  help: 'Set the position and style of the legend on the plot',
  fn: function legendFn(args) {
    return alter(args, function (eachSeries, position, columns) {
      eachSeries._global = eachSeries._global || {};
      eachSeries._global.legend = eachSeries._global.legend || {};
      eachSeries._global.legend.noColumns = columns;

      if (position === false) {
        eachSeries._global.legend.show = false;
      } else {
        eachSeries._global.legend.position = position;
      }

      return eachSeries;
    });
  }
});
