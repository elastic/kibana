/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
// Import fitFunctions directly to break circular dependency with load_functions
import { fitFunctions } from '../../fit_functions';

export default class TimelionFunction {
  name: string;
  args: any[];
  argsByName: Record<string, any>;
  help: string;
  aliases: string[];
  extended: boolean;
  originalFn: (...args: any[]) => any;
  fn: (args: any, tlConfig: any) => Promise<any>;

  constructor(name: string, config: any) {
    this.name = name;
    this.args = config.args || [];
    this.argsByName = _.keyBy(this.args, 'name');
    this.help = config.help || '';
    this.aliases = config.aliases || [];
    this.extended = config.extended || false;

    // WTF is this? How could you not have a fn? Wtf would the thing be used for?
    const originalFunction =
      config.fn ||
      function (input: any) {
        return input;
      };

    // Currently only re-fits the series.
    this.originalFn = originalFunction;

    this.fn = function (args: any, tlConfig: any) {
      const cfg = _.clone(tlConfig);
      return Promise.resolve(originalFunction(args, cfg)).then(function (seriesList: any) {
        seriesList.list = _.map(seriesList.list, function (series: any) {
          const target = tlConfig.getTargetSeries();

          // Don't fit if the series are already the same
          if (_.isEqual(_.map(series.data, 0), _.map(target, 0))) return series;

          let fit: string;
          if (args.byName.fit) {
            fit = args.byName.fit;
          } else if (series.fit) {
            fit = series.fit;
          } else {
            fit = 'nearest';
          }

          series.data = (fitFunctions as any)[fit](series.data, tlConfig.getTargetSeries());
          return series;
        });
        return seriesList;
      });
    };
  }
}
