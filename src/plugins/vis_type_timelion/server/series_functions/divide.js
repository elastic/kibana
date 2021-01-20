/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import reduce from '../lib/reduce.js';
import Chainable from '../lib/classes/chainable';

export default new Chainable('divide', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'divisor',
      types: ['seriesList', 'number'],
      help: i18n.translate('timelion.help.functions.divide.args.divisorHelpText', {
        defaultMessage:
          'Number or series to divide by. SeriesList with multiple series will be applied label-wise.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.divideHelpText', {
    defaultMessage:
      'Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  }),
  fn: function divideFn(args) {
    return reduce(args, function (a, b) {
      return a / b;
    });
  },
});
