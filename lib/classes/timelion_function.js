var _ = require('lodash');
var loadFunctions = require('../load_functions.js');
var fitFunctions  = loadFunctions('fit_functions');

module.exports = class TimelionFunction {
  constructor(name, config) {
    this.name = name;
    this.args = config.args || [];
    this.argsByName = _.indexBy(this.args, 'name');
    this.help = config.help || '';
    this.aliases = config.aliases || [];

    // WTF is this? How could you not have a fn? Wtf would the thing be used for?
    var originalFunction = config.fn || function (input) { return input; };

    // Currently only re-fits the series.
    this.fn = function (args, tlConfig) {
      var config = _.clone(tlConfig);
      return originalFunction(args, config).then(function (seriesList) {
        seriesList.list = _.map(seriesList.list, function (series) {
          var target = tlConfig.getTargetSeries();

          // Don't fit if the last of the target and last of series are the same
          if (_.last(series.data)[0] === _.last(target)[0]) return series;

          var fit;
          if (args.byName.fit) {
            fit = args.byName.fit;
          } else if (series.fit) {
            fit = series.fit;
          } else {
            fit = 'nearest';
          }

          series.data = fitFunctions[fit](series.data, tlConfig.getTargetSeries());
          return series;
        });
        return seriesList;
      });
    }
  }
};