var alter = require('../utils/alter.js');

module.exports = {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'axisNumber',
      types: ['number']
    }
  ],
  help: 'This is an internal function that simply returns the input series. Don\'t use this',
  fn: function yaxis (inputSeries, axisNumber) {
  return alter([inputSeries, axisNumber], function (args) {
    args[0].yaxis = args[1];
    return args[0];
  });
}
};
