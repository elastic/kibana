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

export default new Chainable('range', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'min',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.range.args.minHelpText', {
        defaultMessage: 'New minimum value',
      }),
    },
    {
      name: 'max',
      types: ['number'],
      help: i18n.translate('timelion.help.functions.range.args.maxHelpText', {
        defaultMessage: 'New maximum value',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.rangeHelpText', {
    defaultMessage: 'Changes the max and min of a series while keeping the same shape',
  }),
  fn: function range(args) {
    return alter(args, function (eachSeries) {
      const values = _.map(eachSeries.data, 1);
      const min = _.min(values);
      const max = _.max(values);

      // newvalue= (max'-min')/(max-min)*(value-min)+min'.
      const data = _.map(eachSeries.data, function (point) {
        const val =
          ((args.byName.max - args.byName.min) / (max - min)) * (point[1] - min) + args.byName.min;
        return [point[0], val];
      });
      eachSeries.data = data;
      return eachSeries;
    });
  },
});
