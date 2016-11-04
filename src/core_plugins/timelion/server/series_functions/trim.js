let alter = require('../lib/alter.js');
let _ = require('lodash');
let Chainable = require('../lib/classes/chainable');
let argType = require('../handlers/lib/arg_type.js');

module.exports = new Chainable('trim', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'start',
      types: ['number', 'null'],
      help: 'Buckets to trim from the beginning of the series. Default: 1'
    },
    {
      name: 'end',
      types: ['number', 'null'],
      help: 'Buckets to trim from the end of the series. Default: 1'
    }
  ],
  help: 'Set N buckets at the start or end of a series to null to fit the "partial bucket issue"',
  fn: function conditionFn(args) {
    let config = args.byName;
    if (config.start == null) config.start = 1;
    if (config.end == null) config.end = 1;

    return alter(args, function (eachSeries) {

      _.times(config.start, function (i) {
        eachSeries.data[i][1] = null;
      });

      _.times(config.end, function (i) {
        eachSeries.data[(eachSeries.data.length - 1) - i][1] = null;
      });

      return eachSeries;
    });
  }
});
