const alter = require('../lib/alter.js');
const Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('first', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    }
  ],
  help: 'This is an internal function that simply returns the input seriesList. Don\'t use this',
  fn: function firstFn(args) {
    return alter(args, function (eachSeries) {
      return eachSeries;
    });
  }
});