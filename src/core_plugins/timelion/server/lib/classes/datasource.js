import loadFunctions from '../load_functions.js';
const fitFunctions  = loadFunctions('fit_functions');
import TimelionFunction from './timelion_function';
import offsetTime from '../offset_time';
import _ from 'lodash';


function offsetSeries(response, offset) {
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
      types: ['string', 'null'],
      help: 'Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now'
    });

    config.args.push({
      name: 'fit',
      types: ['string', 'null'],
      help: 'Algorithm to use for fitting series to the target time span and interval. Available: ' + _.keys(fitFunctions).join(', ')
    });

    // Wrap the original function so we can modify inputs/outputs with offset & fit
    const originalFunction = config.fn;
    config.fn = function (args, tlConfig) {
      const config = _.clone(tlConfig);
      if (args.byName.offset) {
        config.time = _.cloneDeep(tlConfig.time);
        config.time.from = offsetTime(config.time.from, args.byName.offset);
        config.time.to = offsetTime(config.time.to, args.byName.offset);
      }

      return Promise.resolve(originalFunction(args, config)).then(function (seriesList) {
        seriesList.list = _.map(seriesList.list, function (series) {
          if (series.data.length === 0) throw new Error(name + '() returned no results');
          series.data = offsetSeries(series.data, args.byName.offset);
          series.fit = args.byName.fit || series.fit || 'nearest';
          return series;
        });
        return seriesList;

      });
    };

    super(name, config);

    // You  need to call timelionFn if calling up a datasource from another datasource,
    // otherwise teh series will end up being offset twice.
    this.timelionFn = originalFunction;
    this.datasource = true;
    this.cacheKey = function (item) {
      return item.text;
    };
    Object.freeze(this);
  }

};
