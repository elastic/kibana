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
import loadFunctions from '../lib/load_functions.js';
const fitFunctions = loadFunctions('fit_functions');

export default new Chainable('fit', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'mode',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.fit.args.modeHelpText', {
        defaultMessage:
          'The algorithm to use for fitting the series to the target. One of: {fitFunctions}',
        values: {
          fitFunctions: _.keys(fitFunctions).join(', '),
        },
      }),
      suggestions: _.keys(fitFunctions).map((key) => {
        return { name: key };
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.fitHelpText', {
    defaultMessage: 'Fills null values using a defined fit function',
  }),
  fn: function absFn(args) {
    return alter(args, function (eachSeries, mode) {
      const noNulls = eachSeries.data.filter((item) => item[1] === 0 || item[1]);

      if (noNulls.length === 0) {
        return eachSeries;
      }

      eachSeries.data = fitFunctions[mode](noNulls, eachSeries.data);
      return eachSeries;
    });
  },
});
