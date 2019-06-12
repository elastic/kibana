/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
          reason: i18n.translate('tsvb.replaceVars.errors.unknownVarDescription', {
            defaultMessage: '{badVar} is an unknown variable',
            values: { badVar: '{{' + badVar + '}}' },
          }),
          title: i18n.translate('tsvb.replaceVars.errors.unknownVarTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    } else {
      e.error = {
        caused_by: {
          reason: i18n.translate('tsvb.replaceVars.errors.markdownErrorDescription', {
            defaultMessage:
              'Please verify you are only using markdown, known variables, and built-in Handlebars expressions',
          }),
          title: i18n.translate('tsvb.replaceVars.errors.markdownErrorTitle', {
            defaultMessage: 'Error processing your markdown',
          }),
        },
      };
    }
    return e;
  }
}
