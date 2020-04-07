/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import loadFunctions from '../load_functions.js';
const fitFunctions = loadFunctions('fit_functions');

export default class TimelionFunction {
  constructor(name, config) {
    this.name = name;
    this.args = config.args || [];
    this.argsByName = _.indexBy(this.args, 'name');
    this.help = config.help || '';
    this.aliases = config.aliases || [];
    this.extended = config.extended || false;

    // WTF is this? How could you not have a fn? Wtf would the thing be used for?
    const originalFunction =
      config.fn ||
      function(input) {
        return input;
      };

    // Currently only re-fits the series.
    this.originalFn = originalFunction;

    this.fn = function(args, tlConfig) {
      const config = _.clone(tlConfig);
      return Promise.resolve(originalFunction(args, config)).then(function(seriesList) {
        seriesList.list = _.map(seriesList.list, function(series) {
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
