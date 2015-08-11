var alter = require('../lib/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'width',
      types: ['number', 'null']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function barsFn(args) {
    return alter(args, function (inputSeries, width) {
      inputSeries.bars = inputSeries.bars || {};
      inputSeries.bars.show = width == null ? 1 : width;
      inputSeries.bars.lineWidth = width == null ? 6 : width;
      return inputSeries;
    });
  }
};
