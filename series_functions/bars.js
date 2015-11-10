var alter = require('../lib/alter.js');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('bars', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'width',
      types: ['number', 'null'],
      help: 'Width of bars in pixels'
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function barsFn(args) {
    return alter(args, function (eachSeries, width) {
      eachSeries.bars = eachSeries.bars || {};
      eachSeries.bars.show = width == null ? 1 : width;
      eachSeries.bars.lineWidth = width == null ? 6 : width;
      return eachSeries;
    });
  }
});
