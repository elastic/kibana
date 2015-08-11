var alter = require('../lib/alter.js');
var util = require('util');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'label',
      types: ['string']
    }
  ],
  help: 'Change the color of the series',
  fn:  function labelFn(args) {
    return alter(args, function (inputSeries, label) {
      if (label.indexOf('%s') !== -1) {
        inputSeries.label =  util.format(label, inputSeries.label);
      } else {
        inputSeries.label =  label;
      }

      return inputSeries;
    });
  }
};
