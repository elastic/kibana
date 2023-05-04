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

export default new Chainable('abs', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
  ],
  help: i18n.translate('timelion.help.functions.absHelpText', {
    defaultMessage: 'Return the absolute value of each value in the series list',
  }),
  fn: function absFn(args) {
    return alter(args, function (eachSeries) {
      const data = _.map(eachSeries.data, function (point) {
        return [point[0], Math.abs(point[1])];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  },
});
