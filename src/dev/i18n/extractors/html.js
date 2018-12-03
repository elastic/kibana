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

import cheerio from 'cheerio';
import { parse } from '@babel/parser';
import { isObjectExpression, isStringLiteral } from '@babel/types';

import {
  isPropertyWithKey,
  formatHTMLString,
  formatJSString,
  traverseNodes,
  checkValuesProperty,
  createParserErrorMessage,
  extractMessageValueFromNode,
  extractValuesKeysFromNode,
  extractDescriptionValueFromNode,
} from '../utils';
import { DEFAULT_MESSAGE_KEY, DESCRIPTION_KEY, VALUES_KEY } from '../constants';
import { createFailError } from '../../run';

/**
 * Find all substrings of "{{ any text }}" pattern allowing '{' and '}' chars in single quote strings
 *
 * Example: `{{ ::'message.id' | i18n: { defaultMessage: 'Message with {{curlyBraces}}' } }}`
 */
const ANGULAR_EXPRESSION_REGEX = /{{([^{}]|({([^']|('([^']|(\\'))*'))*?}))*}}+/g;

const LINEBREAK_REGEX = /\n/g;
const I18N_FILTER_MARKER = '| i18n: ';

function parseExpression(expression) {
  let ast;

  try {
    ast = parse(`+${expression}`.replace(LINEBREAK_REGEX, ' '));
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorWithContext = createParserErrorMessage(` ${expression}`, error);
      throw createFailError(`Couldn't parse angular i18n expression:\n${errorWithContext}`);
    }
  }

  return ast;
}

/**
 * Extract default message from an angular filter expression argument
 * @param {string} expression JavaScript code containing a filter object
 * @param {string} messageId id of the message
 * @returns {{ message?: string, description?: string, valuesKeys: string[]] }}
 */
function parseFilterObjectExpression(expression, messageId) {
  const ast = parseExpression(expression);
  const objectExpressionNode = [...traverseNodes(ast.program.body)].find(node =>
    isObjectExpression(node)
  );

  if (!objectExpressionNode) {
    return {};
  }

  const [messageProperty, descriptionProperty, valuesProperty] = [
    DEFAULT_MESSAGE_KEY,
    DESCRIPTION_KEY,
    VALUES_KEY,
  ].map(key => objectExpressionNode.properties.find(property => isPropertyWithKey(property, key)));

  const message = messageProperty
    ? formatJSString(extractMessageValueFromNode(messageProperty.value, messageId))
    : undefined;

  const description = descriptionProperty
    ? formatJSString(extractDescriptionValueFromNode(descriptionProperty.value, messageId))
    : undefined;

  const valuesKeys = valuesProperty
    ? extractValuesKeysFromNode(valuesProperty.value, messageId)
    : [];

  return { message, description, valuesKeys };
}

function parseIdExpression(expression) {
  const ast = parseExpression(expression);
  const stringNode = [...traverseNodes(ast.program.body)].find(node => isStringLiteral(node));

  if (!stringNode) {
    throw createFailError(`Message id should be a string literal, but got: \n${expression}`);
  }

  return stringNode ? formatJSString(stringNode.value) : null;
}

function trimCurlyBraces(string) {
  return string.slice(2, -2).trim();
}

/**
 * Removes parentheses from the start and the end of a string.
 *
 * Example: `('id' | i18n: { defaultMessage: 'Message' })`
 * @param {string} string string to trim
 */
function trimParentheses(string) {
  if (string.startsWith('(') && string.endsWith(')')) {
    return string.slice(1, -1);
  }

  return string;
}

/**
 * Removes one-time binding operator `::` from the start of a string.
 *
 * Example: `::'id' | i18n: { defaultMessage: 'Message' }`
 * @param {string} string string to trim
 */
function trimOneTimeBindingOperator(string) {
  if (string.startsWith('::')) {
    return string.slice(2);
  }

  return string;
}

/**
 * Remove interpolation expressions from angular and throw on `| i18n:` substring.
 *
 * Correct usage: `<p aria-label="{{ ::'namespace.id' | i18n: { defaultMessage: 'Message' } }}"></p>`.
 *
 * Incorrect usage: `ng-options="mode as ('metricVis.colorModes.' + mode | i18n: { defaultMessage: mode }) for mode in collections.metricColorMode"`
 *
 * @param {string} string html content
 */
function validateI18nFilterUsage(string) {
  const stringWithoutExpressions = string.replace(ANGULAR_EXPRESSION_REGEX, '');
  const i18nMarkerPosition = stringWithoutExpressions.indexOf(I18N_FILTER_MARKER);

  if (i18nMarkerPosition === -1) {
    return;
  }

  const linesCount = (stringWithoutExpressions.slice(0, i18nMarkerPosition).match(/\n/g) || [])
    .length;

  const errorWithContext = createParserErrorMessage(string, {
    loc: {
      line: linesCount + 1,
      column: 0,
    },
    message: 'I18n filter can be used only in interpolation expressions',
  });

  throw createFailError(errorWithContext);
}

function* getFilterMessages(htmlContent) {
  validateI18nFilterUsage(htmlContent);

  const expressions = (htmlContent.match(ANGULAR_EXPRESSION_REGEX) || [])
    .filter(expression => expression.includes(I18N_FILTER_MARKER))
    .map(trimCurlyBraces);

  for (const expression of expressions) {
    const filterStart = expression.indexOf(I18N_FILTER_MARKER);
    const idExpression = trimParentheses(
      trimOneTimeBindingOperator(expression.slice(0, filterStart).trim())
    );

    const filterObjectExpression = expression.slice(filterStart + I18N_FILTER_MARKER.length).trim();

    if (!filterObjectExpression || !idExpression) {
      throw createFailError(`Cannot parse i18n filter expression: {{ ${expression} }}`);
    }

    const messageId = parseIdExpression(idExpression);

    if (!messageId) {
      throw createFailError(`Empty "id" value in angular filter expression is not allowed.`);
    }

    const { message, description, valuesKeys } = parseFilterObjectExpression(
      filterObjectExpression,
      messageId
    );

    if (!message) {
      throw createFailError(
        `Empty defaultMessage in angular filter expression is not allowed ("${messageId}").`
      );
    }

    checkValuesProperty(valuesKeys, message, messageId);

    yield [messageId, { message, description }];
  }
}

function* getDirectiveMessages(htmlContent) {
  const $ = cheerio.load(htmlContent);

  const elements = $('[i18n-id]')
    .map(function (idx, el) {
      const $el = $(el);
      return {
        id: $el.attr('i18n-id'),
        defaultMessage: $el.attr('i18n-default-message'),
        description: $el.attr('i18n-description'),
        values: $el.attr('i18n-values'),
      };
    })
    .toArray();

  for (const element of elements) {
    const messageId = formatHTMLString(element.id);
    if (!messageId) {
      throw createFailError(`Empty "i18n-id" value in angular directive is not allowed.`);
    }

    const message = formatHTMLString(element.defaultMessage);
    if (!message) {
      throw createFailError(
        `Empty defaultMessage in angular directive is not allowed ("${messageId}").`
      );
    }

    if (element.values) {
      const ast = parseExpression(element.values);
      const valuesObjectNode = [...traverseNodes(ast.program.body)].find(node =>
        isObjectExpression(node)
      );
      const valuesKeys = extractValuesKeysFromNode(valuesObjectNode);

      checkValuesProperty(valuesKeys, message, messageId);
    } else {
      checkValuesProperty([], message, messageId);
    }

    yield [messageId, { message, description: formatHTMLString(element.description) || undefined }];
  }
}

export function* extractHtmlMessages(buffer) {
  const content = buffer.toString();
  yield* getDirectiveMessages(content);
  yield* getFilterMessages(content);
}
