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
