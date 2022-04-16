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

export default new Chainable('cusum', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'base',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.cusum.args.baseHelpText', {
        defaultMessage:
          'Number to start at. Basically just adds this to the beginning of the series',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.cusumHelpText', {
    defaultMessage: 'Return the cumulative sum of a series, starting at a base.',
  }),
  fn: function cusumFn(args) {
    return alter(args, function (eachSeries, base) {
      const pairs = eachSeries.data;
      let total = base || 0;
      eachSeries.data = _.map(pairs, function (point) {
        total += point[1];
        return [point[0], total];
      });

      return eachSeries;
    });
  },
});
