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
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isNode,
  isObjectExpression,
  isObjectProperty,
  isStringLiteral,
} from '@babel/types';
import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';

import { createFailError } from '../run';

const ESCAPE_LINE_BREAK_REGEX = /(?<!\\)\\\n/g;
const HTML_LINE_BREAK_REGEX = /[\s]*\n[\s]*/g;
const VALUES_REFERENCES_REGEX = /{\s*\w+([,\s\w]|({.*}))*}/g;
const EXTRACT_VALUE_KEY_FROM_REFERENCE_REGEX = /(?<=^{)\w+(?=[},])/g;

export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const globAsync = promisify(glob);

export function difference(left = [], right = []) {
  return left.filter(value => !right.includes(value));
}

export function isPropertyWithKey(property, identifierName) {
  return isObjectProperty(property) && isIdentifier(property.key, { name: identifierName });
}

/**
 * Detect angular i18n service call or `@kbn/i18n` translate function call.
 *
 * Service call example: `i18n('message-id', { defaultMessage: 'Message text'})`
 *
 * `@kbn/i18n` example: `i18n.translate('message-id', { defaultMessage: 'Message text'})`
 */
export function isI18nTranslateFunction(node) {
  return (
    isCallExpression(node) &&
    (isIdentifier(node.callee, { name: 'i18n' }) ||
      (isMemberExpression(node.callee) &&
        isIdentifier(node.callee.object, { name: 'i18n' }) &&
        isIdentifier(node.callee.property, { name: 'translate' })))
  );
}

export function formatJSString(string) {
  return (string || '').replace(ESCAPE_LINE_BREAK_REGEX, '');
}

export function formatHTMLString(string) {
  return (string || '').replace(HTML_LINE_BREAK_REGEX, ' ');
}

/**
 * Traverse an array of nodes using default depth-first traversal algorithm.
 * We don't use `@babel/traverse` because of its bug: https://github.com/babel/babel/issues/8262
 *
 * @generator
 * @param {object[]} nodes array of nodes or objects with Node values
 * @yields {Node} each node
 */
export function* traverseNodes(nodes) {
  for (const node of nodes) {
    if (isNode(node)) {
      yield node;
    }

    // if node is an object / array, traverse all of its object values
    if (node && typeof node === 'object') {
      yield* traverseNodes(Object.values(node).filter(value => value && typeof value === 'object'));
    }
  }
}

/**
 * @param {string[]} valuesKeys array of "values" property keys
 * @param {string} defaultMessage "defaultMessage" value
 * @throws if "values" and "defaultMessage" don't correspond to each other
 */
export function checkValuesProperty(valuesKeys, defaultMessage, messageId) {
  const defaultMessageReferences = defaultMessage.match(VALUES_REFERENCES_REGEX);

  if (!defaultMessageReferences) {
    return;
  }

  const defaultMessageReferencesKeys = defaultMessageReferences.map(
    message => message.trim().match(EXTRACT_VALUE_KEY_FROM_REFERENCE_REGEX)[0]
  );

  const unusedKeys = difference(defaultMessageReferencesKeys, valuesKeys);
  const missingKeys = difference(valuesKeys, defaultMessageReferencesKeys);

  if (unusedKeys.length) {
    throw createFailError(
      `"values" object contains unused properties ("${messageId}"):
[${unusedKeys}].`
    );
  }

  if (missingKeys.length) {
    throw createFailError(
      `some properties are missing in "values" object ("${messageId}"):
[${missingKeys}].`
    );
  }
}

export function extractMessageIdFromNode(node) {
  if (!isStringLiteral(node)) {
    throw createFailError(`Message id should be a string literal.`);
  }

  return node.value;
}

export function extractMessageValueFromNode(node, id) {
  if (!isStringLiteral(node)) {
    throw createFailError(`defaultMessage value should be a string literal ("${id}").`);
  }

  return node.value;
}

export function extractContextValueFromNode(node, id) {
  if (!isStringLiteral(node)) {
    throw createFailError(`context value should be a string literal ("${id}").`);
  }

  return node.value;
}

export function extractValuesKeysFromNode(node, id) {
  if (!isObjectExpression(node)) {
    throw createFailError(`"values" value should be an object expression ("${id}").`);
  }

  return node.properties.map(
    property => (isStringLiteral(property.key) ? property.key.value : property.key.name)
  );
}
