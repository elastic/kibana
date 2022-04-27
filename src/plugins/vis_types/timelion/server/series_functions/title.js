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

export default new Chainable('title', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'title',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.title.args.titleHelpText', {
        defaultMessage: 'Title for the plot.',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.titleHelpText', {
    defaultMessage:
      'Adds a title to the top of the plot. If called on more than 1 seriesList the last call will be used.',
  }),
  fn: function hideFn(args) {
    return alter(args, function (eachSeries, title) {
      eachSeries._title = title;
      return eachSeries;
    });
  },
});
