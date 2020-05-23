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

export default new Chainable('log', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'base',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.log.args.baseHelpText', {
        defaultMessage: 'Set logarithmic base, 10 by default',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.logHelpText', {
    defaultMessage:
      'Return the logarithm value of each value in the series list (default base: 10)',
  }),
  fn: function logFn(args) {
    const config = args.byName;
    return alter(args, function(eachSeries) {
      const data = _.map(eachSeries.data, function(point) {
        return [point[0], Math.log(point[1]) / Math.log(config.base || 10)];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  },
});
