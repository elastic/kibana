var alter = require('../lib/alter.js');
var util = require('util');

var Chainable = require('../lib/classes/chainable');
module.exports = new Chainable('label', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'label',
      types: ['string'],
      help: 'Legend value for series. You can use %s to reference to current label.'
    }
  ],
  help: 'Change the label of the series. Use %s reference the existing label',
  fn:  function labelFn(args) {
    return alter(args, function (eachSeries, label) {
      if (label.indexOf('%s') !== -1) {
        eachSeries.label =  util.format(label, eachSeries.label);
      } else {
        eachSeries.label =  label;
      }

      return eachSeries;
    });
  }
});
