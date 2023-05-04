/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import loadFunctions from '../load_functions';
const fitFunctions = loadFunctions('fit_functions');

export default class TimelionFunction {
  constructor(name, config) {
    this.name = name;
    this.args = config.args || [];
    this.argsByName = _.keyBy(this.args, 'name');
    this.help = config.help || '';
    this.aliases = config.aliases || [];
    this.extended = config.extended || false;

    // WTF is this? How could you not have a fn? Wtf would the thing be used for?
    const originalFunction =
      config.fn ||
      function (input) {
        return input;
      };

    // Currently only re-fits the series.
    this.originalFn = originalFunction;

    this.fn = function (args, tlConfig) {
      const config = _.clone(tlConfig);
      return Promise.resolve(originalFunction(args, config)).then(function (seriesList) {
        seriesList.list = _.map(seriesList.list, function (series) {
          const target = tlConfig.getTargetSeries();

          // Don't fit if the series are already the same
          if (_.isEqual(_.map(series.data, 0), _.map(target, 0))) return series;

          let fit;
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
    };
  }
}
