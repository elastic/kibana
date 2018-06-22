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

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

import { extractI18nCallMessages } from './extract_i18n_call_messages';
import { isI18nTranslateFunction } from './utils';

/**
 * Matches `i18n(...)` in `#{i18n('id', { defaultMessage: 'Message text' })}`
 */
const JADE_I18N_REGEX = /(?<=\#\{)i18n\((([^)']|'([^'\\]|\\.)*')*\)(?=\}))/g;

/**
 * Example: `#{i18n('message-id', { defaultMessage: 'Message text' })}`
 */
export function* extractJadeMessages(buffer) {
  const expressions = buffer.toString().match(JADE_I18N_REGEX) || [];

  for (const expression of expressions) {
    let messageId;
    let message;
    let context;

    traverse(parse(expression), {
      enter(path) {
        if (isI18nTranslateFunction(path.node)) {
          [messageId, { message, context }] = extractI18nCallMessages(
            path.node
          );
          path.stop();
        }
      },
    });

    yield [messageId, { message, context }];
  }
}
