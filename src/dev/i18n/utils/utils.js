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
  isBinaryExpression,
} from '@babel/types';
import fs from 'fs';
import glob from 'glob';
import { promisify } from 'util';
import normalize from 'normalize-path';
import path from 'path';
import chalk from 'chalk';
import parser from 'intl-messageformat-parser';

import { createFailError } from '@kbn/dev-utils';

const ESCAPE_LINE_BREAK_REGEX = /(?<!\\)\\\n/g;
const HTML_LINE_BREAK_REGEX = /[\s]*\n[\s]*/g;

const ARGUMENT_ELEMENT_TYPE = 'argumentElement';
const HTML_KEY_PREFIX = 'html_';

export const readFileAsync = promisify(fs.readFile);
export const writeFileAsync = promisify(fs.writeFile);
export const makeDirAsync = promisify(fs.mkdir);
export const accessAsync = promisify(fs.access);
export const globAsync = promisify(glob);

export function normalizePath(inputPath) {
  return normalize(path.relative('.', inputPath));
}

export function difference(left = [], right = []) {
  return left.filter((value) => !right.includes(value));
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
      yield* traverseNodes(
        Object.values(node).filter((value) => value && typeof value === 'object')
      );
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
 * Recursively extracts all references from ICU message ast.
 *
 * Example: `'Removed tag {tag} from {assignmentsLength, plural, one {beat {beatName}} other {# beats}}.'`
 *
 * @param {any} node
 * @param {Set<string>} keys
 */
function extractValueReferencesFromIcuAst(node, keys = new Set()) {
  if (Array.isArray(node.elements)) {
    for (const element of node.elements) {
      if (element.type !== ARGUMENT_ELEMENT_TYPE) {
        continue;
      }

      keys.add(element.id);

      // format contains all specific parameters for complex argumentElements
      if (element.format && Array.isArray(element.format.options)) {
        for (const option of element.format.options) {
          extractValueReferencesFromIcuAst(option, keys);
        }
      }
    }
  } else if (node.value) {
    extractValueReferencesFromIcuAst(node.value, keys);
  }

  return [...keys];
}

/**
 * Checks whether values from "values" and "defaultMessage" correspond to each other.
 *
 * @param {string[]} prefixedValuesKeys array of "values" property keys
 * @param {string} defaultMessage "defaultMessage" value
 * @param {string} messageId message id for fail errors
 * @throws if "values" and "defaultMessage" don't correspond to each other
 */
export function checkValuesProperty(prefixedValuesKeys, defaultMessage, messageId) {
  // Skip validation if `defaultMessage` doesn't include any ICU values and
  // `values` prop has no keys.
  const defaultMessageValueReferences = extractValueReferencesFromMessage(
    defaultMessage,
    messageId
  );
  if (!prefixedValuesKeys.length && defaultMessageValueReferences.length === 0) {
    return;
  }

  const valuesKeys = prefixedValuesKeys.map((key) =>
    key.startsWith(HTML_KEY_PREFIX) ? key.slice(HTML_KEY_PREFIX.length) : key
  );

  const missingValuesKeys = difference(defaultMessageValueReferences, valuesKeys);
  if (missingValuesKeys.length) {
    throw createFailError(
      `some properties are missing in "values" object ("${messageId}"): [${missingValuesKeys}].`
    );
  }

  const unusedValuesKeys = difference(valuesKeys, defaultMessageValueReferences);
  if (unusedValuesKeys.length) {
    throw createFailError(
      `"values" object contains unused properties ("${messageId}"): [${unusedValuesKeys}].`
    );
  }
}

/**
 * Extracts value references from the ICU message.
 * @param message ICU message.
 * @param messageId ICU message id
 * @returns {string[]}
 */
export function extractValueReferencesFromMessage(message, messageId) {
  // Skip validation if message doesn't use ICU.
  if (!message.includes('{')) {
    return [];
  }

  let messageAST;
  try {
    messageAST = parser.parse(message);
  } catch (error) {
    if (error.name === 'SyntaxError') {
      const errorWithContext = createParserErrorMessage(message, {
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

  // Skip extraction if intl-messageformat-parser didn't return an AST with nonempty elements array.
  if (!messageAST || !messageAST.elements || !messageAST.elements.length) {
    return [];
  }

  return extractValueReferencesFromIcuAst(messageAST);
}

export function extractMessageIdFromNode(node) {
  if (!isStringLiteral(node)) {
    throw createFailError(`Message id should be a string literal.`);
  }

  return node.value;
}

function parseTemplateLiteral(node, messageId) {
  // TemplateLiteral consists of quasis (strings) and expressions.
  // If we have at least one expression in template literal, then quasis length
  // will be greater than 1
  if (node.quasis.length > 1) {
    throw createFailError(`expressions are not allowed in template literals ("${messageId}").`);
  }

  // Babel reads 'cooked' and 'raw' versions of a string.
  // 'cooked' acts like a normal StringLiteral value and interprets backslashes
  // 'raw' is primarily designed for TaggedTemplateLiteral and escapes backslashes
  return node.quasis[0].value.cooked;
}

function extractStringFromNode(node, messageId, errorMessage) {
  if (isStringLiteral(node)) {
    return node.value;
  }

  if (isTemplateLiteral(node)) {
    return parseTemplateLiteral(node, messageId);
  }

  if (isBinaryExpression(node, { operator: '+' })) {
    return (
      extractStringFromNode(node.left, messageId, errorMessage) +
      extractStringFromNode(node.right, messageId, errorMessage)
    );
  }

  throw createFailError(errorMessage);
}

export function extractMessageValueFromNode(node, messageId) {
  return extractStringFromNode(
    node,
    messageId,
    `defaultMessage value should be a string or template literal ("${messageId}").`
  );
}

export function extractDescriptionValueFromNode(node, messageId) {
  return extractStringFromNode(
    node,
    messageId,
    `description value should be a string or template literal ("${messageId}").`
  );
}

export function extractValuesKeysFromNode(node, messageId) {
  if (!isObjectExpression(node)) {
    throw createFailError(`"values" value should be an inline object literal ("${messageId}").`);
  }

  return node.properties.map((property) =>
    isStringLiteral(property.key) ? property.key.value : property.key.name
  );
}

export class ErrorReporter {
  errors = [];

  withContext(context) {
    return { report: (error) => this.report(error, context) };
  }

  report(error, context) {
    this.errors.push(
      `${chalk.white.bgRed(' I18N ERROR ')} Error in ${normalizePath(context.name)}\n${error}`
    );
  }
}

// export function arrayify<Subj = any>(subj: Subj | Subj[]): Subj[] {
export function arrayify(subj) {
  return Array.isArray(subj) ? subj : [subj];
}
