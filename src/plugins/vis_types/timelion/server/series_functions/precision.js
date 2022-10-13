/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import reduce from '../lib/reduce';
import alter from '../lib/alter';
import Chainable from '../lib/classes/chainable';

export default new Chainable('precision', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'precision',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.precision.args.precisionHelpText', {
        defaultMessage: 'The number of digits to truncate each value to',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.precisionHelpText', {
    defaultMessage: 'The number of digits to truncate the decimal portion of the value to',
  }),
  fn: async function precisionFn(args) {
    await alter(args, function (eachSeries, precision) {
      eachSeries._meta = eachSeries._meta || {};
      eachSeries._meta.precision = precision;
      return eachSeries;
    });

    return reduce(args, function (a, b) {
      return parseInt(a * Math.pow(10, b), 10) / Math.pow(10, b);
    });
  },
});
