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
  isJSXIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import { isPropertyWithKey, escapeLineBreak } from './utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY } from './constants';

function extractMessageId(value) {
  if (!isStringLiteral(value)) {
    throw new Error('Message id should be a string literal.');
  }

  return escapeLineBreak(value.value);
}

function extractMessageValue(value, id) {
  if (!isStringLiteral(value)) {
    throw new Error(
      `defaultMessage value should be a string literal for id: ${id}.`
    );
  }

  return escapeLineBreak(value.value);
}

function extractContextValue(value, id) {
  if (!isStringLiteral(value)) {
    throw new Error(`context value should be a string literal for id: ${id}.`);
  }

  return escapeLineBreak(value.value);
}

/**
 * Extract default messages from ReactJS intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const options = node.arguments[0];

  let messageId;
  let message;
  let context;

  if (!isObjectExpression(options)) {
    throw new Error(
      'Object with defaultMessage property is not passed to intl.formatMessage().'
    );
  }

  for (const property of options.properties) {
    if (isPropertyWithKey(property, 'id')) {
      messageId = extractMessageId(property.value);
    } else if (isPropertyWithKey(property, DEFAULT_MESSAGE_KEY)) {
      message = extractMessageValue(property.value, messageId);
    } else if (isPropertyWithKey(property, CONTEXT_KEY)) {
      context = extractContextValue(property.value, messageId);
    }
  }

  if (!messageId) {
    throw new Error('Empty "id" value in intl.formatMessage() is not allowed.');
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
  let messageId;
  let message;
  let context;

  for (const attribute of node.attributes) {
    if (!isJSXAttribute(attribute)) {
      continue;
    }

    if (isJSXIdentifier(attribute.name, { name: 'id' })) {
      messageId = extractMessageId(attribute.value);
    } else if (isJSXIdentifier(attribute.name, { name: DEFAULT_MESSAGE_KEY })) {
      message = extractMessageValue(attribute.value, messageId);
    } else if (isJSXIdentifier(attribute.name, { name: CONTEXT_KEY })) {
      context = extractContextValue(attribute.value, messageId);
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
