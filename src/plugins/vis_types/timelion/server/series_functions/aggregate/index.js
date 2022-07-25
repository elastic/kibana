/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../../lib/alter';
import Chainable from '../../lib/classes/chainable';
import _ from 'lodash';

const functions = {
  avg: require('./avg'),
  cardinality: require('./cardinality'),
  min: require('./min'),
  max: require('./max'),
  last: require('./last'),
  first: require('./first'),
  sum: require('./sum'),
};

export default new Chainable('aggregate', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'function',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.aggregate.args.functionHelpText', {
        defaultMessage: 'One of {functions}',
        values: {
          functions: _.keys(functions).join(', '),
        },
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.aggregateHelpText', {
    defaultMessage:
      'Creates a static line based on result of processing all points in the series. Available functions: {functions}',
    values: {
      functions: _.keys(functions).join(', '),
    },
  }),
  fn: function aggregateFn(args) {
    const fn = functions[args.byName.function];
    if (!fn)
      throw new Error('.aggregate() function must be one of: ' + _.keys(functions).join(', '));

    return alter(args, function (eachSeries) {
      const times = _.map(eachSeries.data, 0);
      const values = _.map(eachSeries.data, 1);

      eachSeries.data = _.zip(times, _.fill(values, fn(values)));
      return eachSeries;
    });
  },
});
