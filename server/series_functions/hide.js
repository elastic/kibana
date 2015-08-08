var alter = require('../lib/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'hide',
      types: ['number', 'null']
    }
  ],
  help: 'Show the seriesList as bars',
  fn: function barsFn (args) {
    return alter(args, function (inputSeries, hide) {
      inputSeries._hide = hide == null ? true : hide;
      return inputSeries;
    });
  }
};
