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

import { extractI18nCallMessages } from './i18n_call';
import { isI18nTranslateFunction, traverseNodes, createParserErrorMessage } from '../utils';
import { createFailError, isFailError } from '@kbn/dev-utils';

/**
 * Matches `i18n(...)` in `#{i18n('id', { defaultMessage: 'Message text' })}`
 */
const PUG_I18N_REGEX = /i18n\((([^)']|'([^'\\]|\\.)*')*)\)/g;

function parsePugExpression(expression) {
  let ast;

  try {
    ast = parse(expression);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorWithContext = createParserErrorMessage(expression, error);
      throw createFailError(
        `Couldn't parse Pug expression with i18n(...) call:\n${errorWithContext}`
      );
    }

    throw error;
  }

  return ast;
}

/**
 * Example: `#{i18n('message-id', { defaultMessage: 'Message text' })}`
 */
export function* extractPugMessages(buffer, reporter) {
  const expressions = buffer.toString().match(PUG_I18N_REGEX) || [];

  for (const expression of expressions) {
    try {
      const ast = parsePugExpression(expression);
      const node = [...traverseNodes(ast.program.body)].find(node => isI18nTranslateFunction(node));

      if (node) {
        yield extractI18nCallMessages(node);
      }
    } catch (error) {
      if (!isFailError(error)) {
        throw error;
      }

      reporter.report(error);
    }
  }
}
