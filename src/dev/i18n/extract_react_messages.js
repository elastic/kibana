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

import { isJSXIdentifier, isObjectExpression, isStringLiteral } from '@babel/types';

import { isPropertyWithKey, formatJSString, formatHTMLString } from './utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY } from './constants';

function extractMessageId(value) {
  if (!isStringLiteral(value)) {
    throw new Error('Message id should be a string literal.');
  }

  return value.value;
}

function extractMessageValue(value, id) {
  if (!isStringLiteral(value)) {
    throw new Error(`defaultMessage value should be a string literal ("${id}").`);
  }

  return value.value;
}

function extractContextValue(value, id) {
  if (!isStringLiteral(value)) {
    throw new Error(`context value should be a string literal ("${id}").`);
  }

  return value.value;
}

/**
 * Extract default messages from ReactJS intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const options = node.arguments[0];

  if (!isObjectExpression(options)) {
    throw new Error('Object with defaultMessage property is not passed to intl.formatMessage().');
  }

  const [messageIdProperty, messageProperty, contextProperty] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    CONTEXT_KEY,
  ].map(key => options.properties.find(property => isPropertyWithKey(property, key)));

  const messageId = messageIdProperty
    ? formatJSString(extractMessageId(messageIdProperty.value))
    : undefined;

  if (!messageId) {
    throw new Error('Empty "id" value in intl.formatMessage() is not allowed.');
  }

  const message = messageProperty
    ? formatJSString(extractMessageValue(messageProperty.value, messageId))
    : undefined;

  if (!message) {
    throw new Error(`Empty defaultMessage in intl.formatMessage() is not allowed ("${messageId}").`);
  }

  const context = contextProperty
    ? formatJSString(extractContextValue(contextProperty.value, messageId))
    : undefined;

  return [messageId, { message, context }];
}

/**
 * Extract default messages from ReactJS <FormattedMessage> element
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractFormattedMessages(node) {
  const [messageIdProperty, messageProperty, contextProperty] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    CONTEXT_KEY,
  ].map(key => node.attributes.find(attribute => isJSXIdentifier(attribute.name, { name: key })));

  const messageId = messageIdProperty
    ? formatHTMLString(extractMessageId(messageIdProperty.value))
    : undefined;

  if (!messageId) {
    throw new Error('Empty "id" value in <FormattedMessage> is not allowed.');
  }

  const message = messageProperty
    ? formatHTMLString(extractMessageValue(messageProperty.value, messageId))
    : undefined;

  if (!message) {
    throw new Error(`Default message in <FormattedMessage> is not allowed ("${messageId}").`);
  }

  const context = contextProperty
    ? formatHTMLString(extractContextValue(contextProperty.value, messageId))
    : undefined;

  return [messageId, { message, context }];
}
