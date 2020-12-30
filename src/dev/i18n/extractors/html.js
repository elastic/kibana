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
import { createFailError, isFailError } from '@kbn/dev-utils';

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
  const objectExpressionNode = [...traverseNodes(ast.program.body)].find((node) =>
    isObjectExpression(node)
  );

  if (!objectExpressionNode) {
    return {};
  }

  const [messageProperty, descriptionProperty, valuesProperty] = [
    DEFAULT_MESSAGE_KEY,
    DESCRIPTION_KEY,
    VALUES_KEY,
  ].map((key) =>
    objectExpressionNode.properties.find((property) => isPropertyWithKey(property, key))
  );

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
  const stringNode = [...traverseNodes(ast.program.body)].find((node) => isStringLiteral(node));

  if (!stringNode) {
    throw createFailError(`Message id should be a string literal, but got: \n${expression}`);
  }

  return stringNode ? formatJSString(stringNode.value) : null;
}

function trimCurlyBraces(string) {
  if (string.startsWith('{{') && string.endsWith('}}')) {
    return string.slice(2, -2).trim();
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

function* extractExpressions(htmlContent) {
  const elements = cheerio.load(htmlContent)('*').toArray();

  for (const element of elements) {
    for (const node of element.children) {
      if (node.type === 'text') {
        yield* (node.data.match(ANGULAR_EXPRESSION_REGEX) || [])
          .filter((expression) => expression.includes(I18N_FILTER_MARKER))
          .map(trimCurlyBraces);
      }
    }

    for (const attribute of Object.values(element.attribs)) {
      if (attribute.includes(I18N_FILTER_MARKER)) {
        yield trimCurlyBraces(attribute);
      }
    }
  }
}

function* getFilterMessages(htmlContent, reporter) {
  for (const expression of extractExpressions(htmlContent)) {
    const filterStart = expression.indexOf(I18N_FILTER_MARKER);

    const idExpression = trimOneTimeBindingOperator(expression.slice(0, filterStart).trim());
    const filterObjectExpression = expression.slice(filterStart + I18N_FILTER_MARKER.length).trim();

    try {
      if (!filterObjectExpression || !idExpression) {
        throw createFailError(`Cannot parse i18n filter expression: ${expression}`);
      }

      const messageId = parseIdExpression(idExpression);

      if (!messageId) {
        throw createFailError('Empty "id" value in angular filter expression is not allowed.');
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
    } catch (error) {
      if (!isFailError(error)) {
        throw error;
      }

      reporter.report(error);
    }
  }
}

function* getDirectiveMessages(htmlContent, reporter) {
  const $ = cheerio.load(htmlContent);

  const elements = $('[i18n-id]')
    .map((idx, el) => {
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
      reporter.report(
        createFailError('Empty "i18n-id" value in angular directive is not allowed.')
      );
      continue;
    }

    const message = formatHTMLString(element.defaultMessage);
    if (!message) {
      reporter.report(
        createFailError(
          `Empty defaultMessage in angular directive is not allowed ("${messageId}").`
        )
      );
      continue;
    }

    try {
      if (element.values) {
        const ast = parseExpression(element.values);
        const valuesObjectNode = [...traverseNodes(ast.program.body)].find((node) =>
          isObjectExpression(node)
        );
        const valuesKeys = extractValuesKeysFromNode(valuesObjectNode);

        checkValuesProperty(valuesKeys, message, messageId);
      } else {
        checkValuesProperty([], message, messageId);
      }

      yield [
        messageId,
        { message, description: formatHTMLString(element.description) || undefined },
      ];
    } catch (error) {
      if (!isFailError(error)) {
        throw error;
      }

      reporter.report(error);
    }
  }
}

export function* extractHtmlMessages(buffer, reporter) {
  const content = buffer.toString();
  yield* getDirectiveMessages(content, reporter);
  yield* getFilterMessages(content, reporter);
}
