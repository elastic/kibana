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

import { isPropertyWithKey, escapeLineBreak } from './utils';
import { DEFAULT_MESSAGE_KEY } from './constants';

/**
 * Extract default messages from ReactJS Intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const options = node.arguments[0];

  let messageId = '';
  let message = '';
  let context;

  if (isObjectExpression(options)) {
    for (const property of options.properties) {
      if (isPropertyWithKey(property, 'id')) {
        if (!isStringLiteral(property.value)) {
          throw new Error('Message id should be a string literal.');
        }

        messageId = property.value.value;
      }

      if (
        isPropertyWithKey(property, DEFAULT_MESSAGE_KEY) &&
        isStringLiteral(property.value)
      ) {
        message = property.value.value;
      }
      if (
        isPropertyWithKey(property, 'context') &&
        isStringLiteral(property.value)
      ) {
        context = property.value.value;
      }
    }
  }

  if (!messageId) {
    throw new Error('Empty "id" value in Intl.formatMessage() is not allowed.');
  }

  if (!message) {
    throw new Error(`Default message is required for id: ${messageId}.`);
  }

  return [messageId, { message, context }];
}

/**
 * Extract default messages from ReactJS <FormattedMessage> element
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractFormattedMessages(node) {
  let messageId = '';
  let message = '';
  let context;

  for (const attribute of node.attributes) {
    if (!isJSXAttribute(attribute)) {
      continue;
    }

    if (isJSXIdentifier(attribute.name, { name: 'id' })) {
      if (!isStringLiteral(attribute.value)) {
        throw new Error('Message id should be a string literal.');
      }

      messageId = attribute.value.value;
    }

    if (
      isJSXIdentifier(attribute.name, {
        name: DEFAULT_MESSAGE_KEY,
      })
    ) {
      if (isJSXExpressionContainer(attribute.value)) {
        // Example: {`Multiline message without
        //escaping line break`}
        message = escapeLineBreak(
          attribute.value.expression.quasis[0].value.raw
        );
      } else if (isStringLiteral(attribute.value)) {
        // Example: 'Single- or multiline message with \
        //escaping line break'
        message = escapeLineBreak(attribute.value.value);
      }
    }

    if (
      isJSXAttribute(attribute) &&
      isJSXIdentifier(attribute.name, {
        name: 'context',
      })
    ) {
      if (isJSXExpressionContainer(attribute.value)) {
        context = escapeLineBreak(
          attribute.value.expression.quasis[0].value.raw
        );
      } else if (isStringLiteral(attribute.value)) {
        context = escapeLineBreak(attribute.value.value);
      }
    }
  }

  if (!messageId) {
    throw new Error('Empty "id" value in <FormattedMessage> is not allowed.');
  }

  if (!message) {
    throw new Error(`Default message is required for id: ${messageId}.`);
  }

  return [messageId, { message, context }];
}
