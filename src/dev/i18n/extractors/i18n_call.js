/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isObjectExpression } from '@babel/types';

import {
  isPropertyWithKey,
  formatJSString,
  checkValuesProperty,
  extractMessageIdFromNode,
  extractMessageValueFromNode,
  extractDescriptionValueFromNode,
  extractValuesKeysFromNode,
} from '../utils';
import { DEFAULT_MESSAGE_KEY, DESCRIPTION_KEY, VALUES_KEY } from '../constants';
import { createFailError } from '@kbn/dev-utils';

/**
 * Extract messages from `funcName('id', { defaultMessage: 'Message text' })` call expression AST
 */
export function extractI18nCallMessages(node) {
  const [idSubTree, optionsSubTree] = node.arguments;
  const messageId = extractMessageIdFromNode(idSubTree);

  if (!messageId) {
    throw createFailError(`Empty "id" value in i18n() or i18n.translate() is not allowed.`);
  }

  if (!isObjectExpression(optionsSubTree)) {
    throw createFailError(
      `Object with defaultMessage property is not passed to i18n() or i18n.translate() function call ("${messageId}").`
    );
  }

  const [messageProperty, descriptionProperty, valuesProperty] = [
    DEFAULT_MESSAGE_KEY,
    DESCRIPTION_KEY,
    VALUES_KEY,
  ].map((key) => optionsSubTree.properties.find((property) => isPropertyWithKey(property, key)));

  const message = messageProperty
    ? formatJSString(extractMessageValueFromNode(messageProperty.value, messageId))
    : undefined;

  const description = descriptionProperty
    ? formatJSString(extractDescriptionValueFromNode(descriptionProperty.value, messageId))
    : undefined;

  if (!message) {
    throw createFailError(
      `Empty defaultMessage in i18n() or i18n.translate() is not allowed ("${messageId}").`
    );
  }

  const valuesKeys = valuesProperty
    ? extractValuesKeysFromNode(valuesProperty.value, messageId)
    : [];

  checkValuesProperty(valuesKeys, message, messageId);

  return [messageId, { message, description }];
}
