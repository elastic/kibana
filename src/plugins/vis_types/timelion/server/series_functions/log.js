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

export default new Chainable('log', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'base',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.log.args.baseHelpText', {
        defaultMessage: 'Set logarithmic base, 10 by default',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.logHelpText', {
    defaultMessage:
      'Return the logarithm value of each value in the series list (default base: 10)',
  }),
  fn: function logFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], Math.log(point[1]) / Math.log(config.base || 10)];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  },
});
