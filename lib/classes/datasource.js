var loadFunctions = require('../load_functions.js');
var fitFunctions  = loadFunctions('fit_functions');
var TimelionFunction = require('./timelion_function');


var _ = require('lodash');
var moment = require('moment');

// usually reverse = false on the request, true on the response
function offsetTime(milliseconds, offset, reverse) {
  if (!offset.match(/[-+][0-9]+[mshdwMy]/g)) {
    throw new Error ('Malformed `offset` at ' + offset);
  }
  var parts = offset.match(/[-+]|[0-9]+|[mshdwMy]/g);

  var add = parts[0] === '+';
  add = reverse ? !add : add;

  var mode = add ? 'add' : 'subtract';

  var momentObj = moment(milliseconds)[mode](parts[1], parts[2]);
  return momentObj.valueOf();
}

function offsetSeries (response, offset) {
  if (offset) {
    response = _.map(response, function (point) {
      return [offsetTime(point[0], offset, true), point[1]];
    });
  }
  return response;
}

module.exports = class Datasource extends TimelionFunction {
  constructor(name, config) {

    // Additional arguments that every dataSource take
    config.args.push({
      name: 'offset',
      types: ['string', 'null']
    });

    config.args.push({
      name: 'fit',
      types: ['string', 'null']
    });

    // Wrap the original function so we can modify inputs/outputs with offset & fit
    var originalFunction = config.fn;
    config.fn = function (args, tlConfig) {
      var config = _.clone(tlConfig);
      if (args.byName.offset) {
        config.time = _.cloneDeep(tlConfig.time);
        config.time.from = offsetTime(config.time.from, args.byName.offset);
        config.time.to = offsetTime(config.time.to, args.byName.offset);
      }

      return originalFunction(args, config).then(function (seriesList) {
        seriesList.list = _.map(seriesList.list, function (series) {
          if (series.data.length === 0) throw new Error(name + '() returned no results');

          series.data = offsetSeries(series.data, args.byName.offset);

          // Now fit the series
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

    super(name, config);

    // You  need to call _fn if calling up a datasource from another datasource,
    // otherwise teh series will end up being fit and offset twice.
    this._fn = originalFunction;
    this.datasource = true;
    this.cacheKey = function (item) {
      return item.text;
    };
    Object.freeze(this);
  }

};