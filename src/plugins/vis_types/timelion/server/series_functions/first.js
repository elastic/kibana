/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import alter from '../lib/alter';
import Chainable from '../lib/classes/chainable';

export default new Chainable('first', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
  ],
  help: i18n.translate('timelion.help.functions.firstHelpText', {
    defaultMessage: `This is an internal function that simply returns the input seriesList. Don't use this`,
  }),
  fn: function firstFn(args) {
    return alter(args, function (eachSeries) {
      return eachSeries;
    });
  },
});
