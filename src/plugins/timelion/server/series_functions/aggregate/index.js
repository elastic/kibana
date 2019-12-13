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
import alter from '../../lib/alter.js';
import Chainable from '../../lib/classes/chainable';
import _ from 'lodash';

const functions = {
  avg: require('./avg'),
  cardinality: require('./cardinality'),
  min: require('./min'),
  max: require('./max'),
  last: require('./last'),
  first: require('./first'),
  sum: require('./sum')
};

export default new Chainable('aggregate', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList']
    },
    {
      name: 'function',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.aggregate.args.functionHelpText', {
        defaultMessage: 'One of {functions}',
        values: {
          functions: _.keys(functions).join(', '),
        },
      }),
    }
  ],
  help: i18n.translate('timelion.help.functions.aggregateHelpText', {
    defaultMessage:
      'Creates a static line based on result of processing all points in the series. Available functions: {functions}',
    values: {
      functions: _.keys(functions).join(', '),
    },
  }),
  fn: function aggregateFn(args) {
    const fn = functions[args.byName.function];
    if (!fn) throw new Error('.aggregate() function must be one of: ' + _.keys(functions).join(', '));

    return alter(args, function (eachSeries) {
      const times = _.map(eachSeries.data, 0);
      const values = _.map(eachSeries.data, 1);

      eachSeries.data = _.zip(times, _.fill(values, fn(values)));
      return eachSeries;
    });
  }
});
