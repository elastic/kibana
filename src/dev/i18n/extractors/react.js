/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
