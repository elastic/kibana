/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import handlebars from 'handlebars/dist/handlebars';
import { i18n } from '@kbn/i18n';

export function replaceVars(str, args = {}, vars = {}) {
  try {
    const template = handlebars.compile(str, { strict: true, knownHelpersOnly: true });

    const string = template(_.assign({}, vars, { args }));

    return string;
  } catch (e) {
    // user is probably typing and so its not formed correctly
    if (e.toString().indexOf('Parse error') !== -1) {
      return str;

      // Unknown variable
    } else if (e.message.indexOf('not defined in') !== -1) {
      const badVar = e.message.split(/"/)[1];
      e.error = {
        caused_by: {
          reason: i18n.translate('visTypeTimeseries.replaceVars.errors.unknownVarDescription', {
            defaultMessage: '{badVar} is an unknown variable',
            values: { badVar: '{{' + badVar + '}}' },
          }),
          title: i18n.translate('visTypeTimeseries.replaceVars.errors.unknownVarTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    } else {
      e.error = {
        caused_by: {
          reason: i18n.translate('visTypeTimeseries.replaceVars.errors.markdownErrorDescription', {
            defaultMessage:
              'Please verify you are only using markdown, known variables, and built-in Handlebars expressions',
          }),
          title: i18n.translate('visTypeTimeseries.replaceVars.errors.markdownErrorTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    }
    return e;
  }
}
