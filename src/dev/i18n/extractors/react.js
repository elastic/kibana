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

import {
  isPropertyWithKey,
  formatJSString,
  formatHTMLString,
  extractMessageIdFromNode,
  extractMessageValueFromNode,
  extractDescriptionValueFromNode,
  extractValuesKeysFromNode,
  checkValuesProperty,
} from '../utils';
import { DEFAULT_MESSAGE_KEY, VALUES_KEY, DESCRIPTION_KEY } from '../constants';
import { createFailError } from '@kbn/dev-utils';

/**
 * Extract default messages from ReactJS intl.formatMessage(...) AST
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractIntlMessages(node) {
  const [options, valuesNode] = node.arguments;

  if (!isObjectExpression(options)) {
    throw createFailError(
      `Object with defaultMessage property is not passed to intl.formatMessage().`
    );
  }

  const [messageIdProperty, messageProperty, descriptionProperty] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    DESCRIPTION_KEY,
  ].map((key) => options.properties.find((property) => isPropertyWithKey(property, key)));

  const messageId = messageIdProperty
    ? formatJSString(extractMessageIdFromNode(messageIdProperty.value))
    : undefined;

  if (!messageId) {
    throw createFailError(`Empty "id" value in intl.formatMessage() is not allowed.`);
  }

  const message = messageProperty
    ? formatJSString(extractMessageValueFromNode(messageProperty.value, messageId))
    : undefined;

  const description = descriptionProperty
    ? formatJSString(extractDescriptionValueFromNode(descriptionProperty.value, messageId))
    : undefined;

  if (!message) {
    throw createFailError(
      `Empty defaultMessage in intl.formatMessage() is not allowed ("${messageId}").`
    );
  }

  const valuesKeys = valuesNode ? extractValuesKeysFromNode(valuesNode, messageId) : [];

  checkValuesProperty(valuesKeys, message, messageId);

  return [messageId, { message, description }];
}

/**
 * Extract default messages from ReactJS <FormattedMessage> element
 * @param node Babel parser AST node
 * @returns {[string, string][]} Array of id-message tuples
 */
export function extractFormattedMessages(node) {
  const [messageIdAttribute, messageAttribute, descriptionAttribute, valuesAttribute] = [
    'id',
    DEFAULT_MESSAGE_KEY,
    DESCRIPTION_KEY,
    VALUES_KEY,
  ].map((key) =>
    node.attributes.find((attribute) => isJSXIdentifier(attribute.name, { name: key }))
  );

  const messageId = messageIdAttribute
    ? formatHTMLString(extractMessageIdFromNode(messageIdAttribute.value))
    : undefined;

  if (!messageId) {
    throw createFailError(`Empty "id" value in <FormattedMessage> is not allowed.`);
  }

  const message = messageAttribute
    ? formatHTMLString(extractMessageValueFromNode(messageAttribute.value, messageId))
    : undefined;

  const description = descriptionAttribute
    ? formatHTMLString(extractDescriptionValueFromNode(descriptionAttribute.value, messageId))
    : undefined;

  if (!message) {
    throw createFailError(
      `Empty default message in <FormattedMessage> is not allowed ("${messageId}").`
    );
  }

  if (
    valuesAttribute &&
    (!isJSXExpressionContainer(valuesAttribute.value) ||
      !isObjectExpression(valuesAttribute.value.expression))
  ) {
    throw createFailError(
      `"values" value in <FormattedMessage> should be an object ("${messageId}").`
    );
  }

  const valuesKeys = valuesAttribute
    ? extractValuesKeysFromNode(valuesAttribute.value.expression, messageId)
    : [];

  checkValuesProperty(valuesKeys, message, messageId);

  return [messageId, { message, description }];
}
