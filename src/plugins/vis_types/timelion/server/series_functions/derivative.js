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

export default new Chainable('derivative', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
  ],
  help: i18n.translate('timelion.help.functions.derivativeHelpText', {
    defaultMessage: 'Plot the change in values over time.',
  }),
  fn: function derivativeFn(args) {
    return alter(args, function (eachSeries) {
      const pairs = eachSeries.data;
      eachSeries.data = _.map(pairs, function (point, i) {
        if (i === 0 || pairs[i - 1][1] == null || point[1] == null) {
          return [point[0], null];
        }
        return [point[0], point[1] - pairs[i - 1][1]];
      });

      return eachSeries;
    });
  },
});
