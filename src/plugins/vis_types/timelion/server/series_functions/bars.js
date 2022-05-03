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

export default new Chainable('bars', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'width',
      types: ['number', 'null'],
      help: i18n.translate('timelion.help.functions.bars.args.widthHelpText', {
        defaultMessage: 'Width of bars in pixels',
      }),
    },
    {
      name: 'stack',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.bars.args.stackHelpText', {
        defaultMessage: 'Should bars be stacked, true by default',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.barsHelpText', {
    defaultMessage: 'Show the seriesList as bars',
  }),
  fn: function barsFn(args) {
    return alter(args, function (eachSeries, width, stack) {
      eachSeries.bars = eachSeries.bars || {};
      eachSeries.bars.show = width == null ? 1 : width;
      eachSeries.bars.lineWidth = width == null ? 6 : width;
      eachSeries.stack = stack == null ? true : stack;
      return eachSeries;
    });
  },
});
