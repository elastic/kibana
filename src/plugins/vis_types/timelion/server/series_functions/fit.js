/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter';
import _ from 'lodash';
import Chainable from '../lib/classes/chainable';
import loadFunctions from '../lib/load_functions';
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
