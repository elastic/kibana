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

export default new Chainable('multiply', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'multiplier',
      types: ['seriesList', 'number'],
      help: i18n.translate('timelion.help.functions.multiply.args.multiplierHelpText', {
        defaultMessage:
          'Number or series by which to multiply. SeriesList with multiple series will be applied label-wise.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.multiplyHelpText', {
    defaultMessage:
      'Multiply the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  }),
  fn: function multiplyFn(args) {
    return reduce(args, function (a, b) {
      return a * b;
    });
  },
});
