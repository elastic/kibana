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

export default new Chainable('subtract', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'term',
      types: ['seriesList', 'number'],
      help: i18n.translate('timelion.help.functions.subtract.args.termHelpText', {
        defaultMessage:
          'Number or series to subtract from input. SeriesList with multiple series will be applied label-wise.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.subtractHelpText', {
    defaultMessage:
      'Subtract the values of one or more series in a seriesList to each position, in each series, of the input seriesList',
  }),
  fn: function subtractFn(args) {
    return reduce(args, function (a, b) {
      return a - b;
    });
  },
});
