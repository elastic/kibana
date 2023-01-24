/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import loadFunctions from '../load_functions';
const fitFunctions = loadFunctions('fit_functions');
import TimelionFunction from './timelion_function';
import { offsetTime, preprocessOffset } from '../offset_time';
import _ from 'lodash';

function offsetSeries(response, offset) {
  if (offset) {
    response = _.map(response, function (point) {
      return [offsetTime(point[0], offset, true), point[1]];
    });
  }
  return response;
}

export default class Datasource extends TimelionFunction {
  constructor(name, config) {
    // Additional arguments that every dataSource take
    config.args.push({
      name: 'offset',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.common.args.offsetHelpText', {
        defaultMessage:
          'Offset the series retrieval by a date expression, e.g., -1M to make events from ' +
          'one month ago appear as if they are happening now. Offset the series relative to the charts ' +
          'overall time range, by using the value "timerange", e.g. "timerange:-2" will specify an offset ' +
          'that is twice the overall chart time range to the past.',
      }),
    });

    config.args.push({
      name: 'fit',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.common.args.fitHelpText', {
        defaultMessage:
          'Algorithm to use for fitting series to the target time span and interval. Available: {fitFunctions}',
        values: {
          fitFunctions: _.keys(fitFunctions).join(', '),
        },
      }),
      hidden: Boolean(config.hideFitArg),
    });

    // Wrap the original function so we can modify inputs/outputs with offset & fit
    const originalFunction = config.fn;
    config.fn = function (args, tlConfig) {
      const config = _.clone(tlConfig);
      let offset = args.byName.offset;
      if (offset) {
        offset = preprocessOffset(offset, tlConfig.time.from, tlConfig.time.to);
        config.time = _.cloneDeep(tlConfig.time);
        config.time.from = offsetTime(config.time.from, offset);
        config.time.to = offsetTime(config.time.to, offset);
      }

      return Promise.resolve(originalFunction(args, config)).then(function (seriesList) {
        seriesList.list = _.map(seriesList.list, function (series) {
          if (series.data.length === 0) throw new Error(name + '() returned no results');
          series.data = offsetSeries(series.data, offset);
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
}
