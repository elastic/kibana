var alter = require('../lib/alter.js');
var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('hide', {
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
  help: 'Hide the series by default',
  fn: function hideFn(args) {
    return alter(args, function (inputSeries, hide) {
      inputSeries._hide = hide == null ? true : hide;
      return inputSeries;
    });
  }
});
