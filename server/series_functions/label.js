var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'seriesLabel',
      types: ['string']
    }
  ],
  help: 'Change the color of the series',
  fn:  function label (inputSeries, seriesLabel) {
    return alter([inputSeries, seriesLabel], function (args) {
      if (args[2] && args[0].label) {
        return args[0];
      }
      args[0].label = args[1];
      return args[0];
    });
  }
};
