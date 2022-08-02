/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import reduce from '../lib/reduce';
import Chainable from '../lib/classes/chainable';

export default new Chainable('min', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'value',
      types: ['seriesList', 'number'],
      help: i18n.translate('timelion.help.functions.min.args.valueHelpText', {
        defaultMessage:
          'Sets the point to whichever is lower, the existing value, or the one passed. ' +
          'If passing a seriesList it must contain exactly 1 series.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.minHelpText', {
    defaultMessage:
      'Minimum values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  }),
  fn: function minFn(args) {
    return reduce(args, function (a, b) {
      return Math.min(a, b);
    });
  },
});
