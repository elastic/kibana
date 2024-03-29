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

export default new Chainable('hide', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'hide',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.hide.args.hideHelpText', {
        defaultMessage: 'Hide or unhide the series',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.hideHelpText', {
    defaultMessage: 'Hide the series by default',
  }),
  fn: function hideFn(args) {
    return alter(args, function (eachSeries, hide) {
      eachSeries._hide = hide == null ? true : hide;
      return eachSeries;
    });
  },
});
