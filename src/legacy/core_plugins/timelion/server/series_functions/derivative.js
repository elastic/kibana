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

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter.js';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';

export default new Chainable('derivative', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
  ],
  help: i18n.translate('timelion.help.functions.derivativeHelpText', {
    defaultMessage: 'Plot the change in values over time.',
  }),
  fn: function derivativeFn(args) {
    return alter(args, function(eachSeries) {
      const pairs = eachSeries.data;
      eachSeries.data = _.map(pairs, function(point, i) {
        if (i === 0 || pairs[i - 1][1] == null || point[1] == null) {
          return [point[0], null];
        }
        return [point[0], point[1] - pairs[i - 1][1]];
      });

      return eachSeries;
    });
  },
});
