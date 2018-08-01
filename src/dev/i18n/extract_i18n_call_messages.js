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

import { isObjectExpression, isStringLiteral } from '@babel/types';

import { isPropertyWithKey, formatJSString } from './utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY } from './constants';

/**
 * Extract messages from `funcName('id', { defaultMessage: 'Message text' })` call expression AST
 */
export function extractI18nCallMessages(node) {
  const [idSubTree, optionsSubTree] = node.arguments;

  if (!isStringLiteral(idSubTree)) {
    throw new Error('Message id in i18n() or i18n.translate() should be a string literal.');
  }

  const messageId = idSubTree.value;

  if (!messageId) {
    throw new Error('Empty "id" value in i18n() or i18n.translate() is not allowed.');
  }

  let message;
  let context;

  if (!isObjectExpression(optionsSubTree)) {
    throw new Error(
      `Empty defaultMessage in i18n() or i18n.translate() is not allowed ("${messageId}").`
    );
  }

  for (const prop of optionsSubTree.properties) {
    if (isPropertyWithKey(prop, DEFAULT_MESSAGE_KEY)) {
      if (!isStringLiteral(prop.value)) {
        throw new Error(
          `defaultMessage value in i18n() or i18n.translate() should be a string literal ("${messageId}").`
        );
      }

      message = formatJSString(prop.value.value);
    } else if (isPropertyWithKey(prop, CONTEXT_KEY)) {
      if (!isStringLiteral(prop.value)) {
        throw new Error(
          `context value in i18n() or i18n.translate() should be a string literal ("${messageId}").`
        );
      }

      context = formatJSString(prop.value.value);
    }
  }

  if (!message) {
    throw new Error(
      `Empty defaultMessage in i18n() or i18n.translate() is not allowed ("${messageId}").`
    );
  }

  return [messageId, { message, context }];
}
