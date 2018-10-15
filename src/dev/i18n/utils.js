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
  isTemplateLiteral,
} from '@babel/types';
import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';
import chalk from 'chalk';
import parser from 'intl-messageformat-parser';

import { createFailError } from '../run';

const ESCAPE_LINE_BREAK_REGEX = /(?<!\\)\\\n/g;
const HTML_LINE_BREAK_REGEX = /[\s]*\n[\s]*/g;

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
 * Forms an formatted error message for parser errors.
 *
 * This function returns a string which represents an error message and a place in the code where the error happened.
 * In total five lines of the code are displayed: the line where the error occured, two lines before and two lines after.
 *
 * @param {string} content a code string where parsed error happened
 * @param {{ loc: { line: number, column: number }, message: string }} error an object that contains an error message and
 * the line number and the column number in the file that raised this error
 * @returns {string} a formatted string representing parser error message
 */
export function createParserErrorMessage(content, error) {
  const line = error.loc.line - 1;
  const column = error.loc.column;

  const contentLines = content.split(/\n/);
  const firstLine = Math.max(line - 2, 0);
  const lastLine = Math.min(line + 2, contentLines.length - 1);

  contentLines[line] =
    contentLines[line].substring(0, column) +
    chalk.white.bgRed(contentLines[line][column] || ' ') +
    contentLines[line].substring(column + 1);

  const context = contentLines.slice(firstLine, lastLine + 1).join('\n');

  return `${error.message}:\n${context}`;
}

/**
 * Checks whether values from "values" and "defaultMessage" correspond to each other.
 *
 * @param {string[]} valuesKeys array of "values" property keys
 * @param {string} defaultMessage "defaultMessage" value
 * @param {string} messageId message id for fail errors
 * @throws if "values" and "defaultMessage" don't correspond to each other
 */
export function checkValuesProperty(valuesKeys, defaultMessage, messageId) {
  // skip validation if defaultMessage doesn't use ICU and values prop has no keys
  if (!valuesKeys.length && !defaultMessage.includes('{')) {
    return;
  }

  let defaultMessageAst;

  try {
    defaultMessageAst = parser.parse(defaultMessage);
  } catch (error) {
    if (error.name === 'SyntaxError') {
      const errorWithContext = createParserErrorMessage(defaultMessage, {
        loc: {
          line: error.location.start.line,
          column: error.location.start.column - 1,
        },
        message: error.message,
      });

      throw createFailError(
        `Couldn't parse default message ("${messageId}"):\n${errorWithContext}`
      );
    }

    throw error;
  }

  const ARGUMENT_ELEMENT_TYPE = 'argumentElement';

  // skip validation if intl-messageformat-parser didn't return an AST with nonempty elements array
  if (!defaultMessageAst || !defaultMessageAst.elements || !defaultMessageAst.elements.length) {
    return;
  }

  const defaultMessageValueReferences = defaultMessageAst.elements.reduce((keys, element) => {
    if (element.type === ARGUMENT_ELEMENT_TYPE) {
      keys.push(element.id);
    }
    return keys;
  }, []);

  const missingValuesKeys = difference(defaultMessageValueReferences, valuesKeys);
  if (missingValuesKeys.length) {
    throw createFailError(
      `some properties are missing in "values" object ("${messageId}"):\n[${missingValuesKeys}].`
    );
  }

  const unusedValuesKeys = difference(valuesKeys, defaultMessageValueReferences);
  if (unusedValuesKeys.length) {
    throw createFailError(
      `"values" object contains unused properties ("${messageId}"):\n[${unusedValuesKeys}].`
    );
  }
}

export function extractMessageIdFromNode(node) {
  if (!isStringLiteral(node)) {
    throw createFailError(`Message id should be a string literal.`);
  }

  return node.value;
}

function parseTemplateLiteral(node, messageId) {
  if (node.quasis.length > 1) {
    throw createFailError(`expressions are not allowed in template literals ("${messageId}").`);
  }

  return node.quasis[0].value.cooked;
}

export function extractMessageValueFromNode(node, messageId) {
  if (isStringLiteral(node)) {
    return node.value;
  }

  if (isTemplateLiteral(node)) {
    return parseTemplateLiteral(node, messageId);
  }

  throw createFailError(
    `defaultMessage value should be a string literal or a template literal ("${messageId}").`
  );
}

export function extractContextValueFromNode(node, messageId) {
  if (isStringLiteral(node)) {
    return node.value;
  }

  if (isTemplateLiteral(node)) {
    return parseTemplateLiteral(node, messageId);
  }

  throw createFailError(
    `context value should be a string literal or a template literal ("${messageId}").`
  );
}

export function extractValuesKeysFromNode(node, messageId) {
  if (!isObjectExpression(node)) {
    throw createFailError(`"values" value should be an object expression ("${messageId}").`);
  }

  return node.properties.map(
    property => (isStringLiteral(property.key) ? property.key.value : property.key.name)
  );
}
