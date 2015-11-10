var alter = require('../lib/alter.js');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('legend', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'position',
      types: ['string', 'null'],
      help: 'Corner to place the legend in: nw, ne, se, or sw'
    },
    {
      name: 'columns',
      types: ['number', 'null'],
      help: 'Number of columns to divide the legend into'
    },
  ],
  help: 'Set the position and style of the legend on the plot',
  fn: function yaxisFn(args) {
    return alter(args, function (eachSeries, position, columns) {
      eachSeries._global = eachSeries._global || {};
      eachSeries._global.legend = eachSeries._global.legend || {};
      eachSeries._global.legend.position = position;
      eachSeries._global.legend.noColumns = columns;

      return eachSeries;
    });
  }
});
