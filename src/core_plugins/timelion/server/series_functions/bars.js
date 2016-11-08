import alter from '../lib/alter.js';
import Chainable from '../lib/classes/chainable';
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
    },
    {
      name: 'stack',
      types: ['boolean', 'null'],
      help: 'Should bars be stacked, true by default'
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function barsFn(args) {
    return alter(args, function (eachSeries, width, stack) {
      eachSeries.bars = eachSeries.bars || {};
      eachSeries.bars.show = width == null ? 1 : width;
      eachSeries.bars.lineWidth = width == null ? 6 : width;
      eachSeries.stack = stack == null ? true : stack;
      return eachSeries;
    });
  }
});
