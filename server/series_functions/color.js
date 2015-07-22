var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'rgbColor',
      types: ['string']
    }
  ],
  help: 'Change the color of the series',
  fn: function color (inputSeries, rgbColor) {
    return alter([inputSeries, rgbColor], function (args) {
      args[0].color = args[1];
      return args[0];
    });
  }
};
