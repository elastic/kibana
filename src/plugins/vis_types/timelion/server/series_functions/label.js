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
import { RE2JS } from 're2js';

export default new Chainable('label', {
  args: [
    {
      name: 'inputSeries',
      types: ['seriesList'],
    },
    {
      name: 'label',
      types: ['string'],
      help: i18n.translate('timelion.help.functions.label.args.labelHelpText', {
        defaultMessage:
          'Legend value for series. You can use $1, $2, etc, in the string to match up with the regex capture groups',
        description: '"$1" and "$2" are part of the expression and must not be translated.',
      }),
    },
    {
      name: 'regex',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.label.args.regexHelpText', {
        defaultMessage: 'A regex with capture group support',
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.labelHelpText', {
    defaultMessage: 'Change the label of the series. Use %s to reference the existing label',
  }),
  fn: function labelFn(args) {
    const config = args.byName;
    return alter(args, function (eachSeries) {
      if (config.regex) {
        eachSeries.label = RE2JS.compile(config.regex)
          .matcher(eachSeries.label)
          .replaceAll(config.label);
      } else if (config.label) {
        eachSeries.label = config.label;
      }

      return eachSeries;
    });
  },
});
