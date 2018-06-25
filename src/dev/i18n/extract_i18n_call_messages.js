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

import {
  isObjectExpression,
  isStringLiteral,
  isTemplateLiteral,
} from '@babel/types';

import { isPropertyWithKey, escapeLineBreak } from './utils';
import { DEFAULT_MESSAGE_KEY } from './constants';

/**
 * Extract messages from `funcName('id', { defaultMessage: 'Message text' })` call expression AST
 */
export function extractI18nCallMessages(node) {
  const [idSubTree, optionsSubTree] = node.arguments;

  if (!isStringLiteral(idSubTree)) {
    throw new Error('Message id should be a string literal.');
  }

  const messageId = idSubTree.value;

  if (isObjectExpression(optionsSubTree)) {
    const defaultMessageProperty = optionsSubTree.properties.find(
      prop =>
        isPropertyWithKey(prop, DEFAULT_MESSAGE_KEY) &&
        (isStringLiteral(prop.value) || isTemplateLiteral(prop.value))
    );

    if (!defaultMessageProperty) {
      throw new Error(`Default message is required for ${messageId} id.`);
    }

    const contextProperty = optionsSubTree.properties.find(
      prop => isPropertyWithKey(prop, 'context') && isStringLiteral(prop.value)
    );

    const message = escapeLineBreak(
      isStringLiteral(defaultMessageProperty.value)
        ? defaultMessageProperty.value.value
        : defaultMessageProperty.value.quasis[0].value.raw
    );
    const context = contextProperty ? contextProperty.value.value : '';

    return [messageId, { message, context }];
  }

  throw new Error(
    `Object with defaultMessage property is not provided for ${messageId} id.`
  );
}
