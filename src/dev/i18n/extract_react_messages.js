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
  isJSXAttribute,
  isJSXExpressionContainer,
  isJSXIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import {
  isPropertyWithKey,
  parseConditionalOperatorAST,
  escapeLineBreak,
} from './utils';
import { DEFAULT_MESSAGE_KEY } from './constants';

/**
 * Extract default messages from ReactJS Intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const options = node.arguments[0];

  const messagesIds = [];
  let messageValue = '';

  if (isObjectExpression(options)) {
    for (const property of options.properties) {
      if (isPropertyWithKey(property, 'id')) {
        messagesIds.push(...parseConditionalOperatorAST(property.value));
      }
      if (
        isPropertyWithKey(property, DEFAULT_MESSAGE_KEY) &&
        isStringLiteral(property.value)
      ) {
        messageValue = property.value.value;
      }
    }
  }

  if (messagesIds.length === 0) {
    throw new Error(
      'Empty "id" values in Intl.formatMessage() are not allowed.'
    );
  }

  if (!messageValue) {
    throw new Error(
      `Default messages are required for ids: ${messagesIds.join(', ')}.`
    );
  }

  return messagesIds.map(id => [id, messageValue]);
}

/**
 * Extract default messages from ReactJS <FormattedMessage> element
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractFormattedMessages(node) {
  const messagesIds = [];
  let messageValue = '';

  for (const attribute of node.attributes) {
    if (
      isJSXAttribute(attribute) &&
      isJSXIdentifier(attribute.name, { name: 'id' })
    ) {
      messagesIds.push(...parseConditionalOperatorAST(attribute.value));
    }

    if (
      isJSXAttribute(attribute) &&
      isJSXIdentifier(attribute.name, {
        name: DEFAULT_MESSAGE_KEY,
      })
    ) {
      if (isJSXExpressionContainer(attribute.value)) {
        messageValue = escapeLineBreak(
          attribute.value.expression.quasis[0].value.raw
        );
      } else if (isStringLiteral(attribute.value)) {
        messageValue = escapeLineBreak(attribute.value.value);
      }
    }
  }

  if (messagesIds.length === 0) {
    throw new Error(
      'Empty "id" values in <FormattedMessage> are not allowed.'
    );
  }

  if (!messageValue) {
    throw new Error(
      `Default messages are required for ids: ${messagesIds.join(', ')}.`
    );
  }

  return messagesIds.map(id => [id, messageValue]);
}
