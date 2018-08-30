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

import { isJSXIdentifier, isObjectExpression, isJSXExpressionContainer } from '@babel/types';
import chalk from 'chalk';

import {
  isPropertyWithKey,
  formatJSString,
  formatHTMLString,
  extractMessageIdFromNode,
  extractMessageValueFromNode,
  extractContextValueFromNode,
  extractValuesKeysFromNode,
  checkValuesProperty,
} from './utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY, VALUES_KEY } from './constants';
import { createFailError } from '../run';

/**
 * Extract default messages from ReactJS intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const options = node.arguments[0];

  if (!isObjectExpression(options)) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
Object with defaultMessage property is not passed to intl.formatMessage().`
    );
  }

  const [messageIdProperty, messageProperty, contextProperty, valuesProperty] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    CONTEXT_KEY,
    VALUES_KEY,
  ].map(key => options.properties.find(property => isPropertyWithKey(property, key)));

  const messageId = messageIdProperty
    ? formatJSString(extractMessageIdFromNode(messageIdProperty.value))
    : undefined;

  if (!messageId) {
    createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
Empty "id" value in intl.formatMessage() is not allowed.`
    );
  }

  const message = messageProperty
    ? formatJSString(extractMessageValueFromNode(messageProperty.value, messageId))
    : undefined;

  const context = contextProperty
    ? formatJSString(extractContextValueFromNode(contextProperty.value, messageId))
    : undefined;

  if (!message) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
Empty defaultMessage in intl.formatMessage() is not allowed ("${messageId}").`
    );
  }

  if (valuesProperty) {
    const valuesKeys = extractValuesKeysFromNode(valuesProperty.value, messageId);
    checkValuesProperty(valuesKeys, message, messageId);
  }

  return [messageId, { message, context }];
}

/**
 * Extract default messages from ReactJS <FormattedMessage> element
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractFormattedMessages(node) {
  const [messageIdAttribute, messageAttribute, contextAttribute, valuesAttribute] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    CONTEXT_KEY,
    VALUES_KEY,
  ].map(key => node.attributes.find(attribute => isJSXIdentifier(attribute.name, { name: key })));

  const messageId = messageIdAttribute
    ? formatHTMLString(extractMessageIdFromNode(messageIdAttribute.value))
    : undefined;

  if (!messageId) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} Empty "id" value in <FormattedMessage> is not allowed.`
    );
  }

  const message = messageAttribute
    ? formatHTMLString(extractMessageValueFromNode(messageAttribute.value, messageId))
    : undefined;

  const context = contextAttribute
    ? formatHTMLString(extractContextValueFromNode(contextAttribute.value, messageId))
    : undefined;

  if (!message) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
Empty default message in <FormattedMessage> is not allowed ("${messageId}").`
    );
  }

  if (valuesAttribute) {
    if (
      !isJSXExpressionContainer(valuesAttribute.value) ||
      !isObjectExpression(valuesAttribute.value.expression)
    ) {
      throw createFailError(
        `${chalk.white.bgRed(' I18N ERROR ')} \
"values" value in <FormattedMessage> should be an object ("${messageId}").`
      );
    }

    const valuesKeys = extractValuesKeysFromNode(valuesAttribute.value.expression, messageId);
    checkValuesProperty(valuesKeys, message, messageId);
  }

  return [messageId, { message, context }];
}
