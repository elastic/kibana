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
import { isDirectiveLiteral, isObjectExpression, isStringLiteral } from '@babel/types';

import {
  isPropertyWithKey,
  formatHTMLString,
  formatJSString,
  traverseNodes,
  createParserErrorMessage,
} from '../utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY } from '../constants';
import { createFailError } from '../../run';

/**
 * Find all substrings of "{{ any text }}" pattern
 */
const ANGULAR_EXPRESSION_REGEX = /\{\{+([\s\S]*?)\}\}+/g;

const I18N_FILTER_MARKER = '| i18n: ';

/**
 * Extract default message from an angular filter expression argument
 * @param {string} expression JavaScript code containing a filter object
 * @returns {string} Default message
 */
function parseFilterObjectExpression(expression) {
  let ast;

  try {
    // parse an object expression instead of block statement
    ast = parse(`+${expression}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorWithContext = createParserErrorMessage(` ${expression}`, error);
      throw createFailError(
        `Couldn't parse angular expression with i18n filter:\n${errorWithContext}`
      );
    }

    throw error;
  }

  for (const node of traverseNodes(ast.program.body)) {
    if (!isObjectExpression(node)) {
      continue;
    }

    let message;
    let context;

    for (const property of node.properties) {
      if (isPropertyWithKey(property, DEFAULT_MESSAGE_KEY)) {
        if (!isStringLiteral(property.value)) {
          throw createFailError(`defaultMessage value should be a string literal.`);
        }

        message = formatJSString(property.value.value);
      } else if (isPropertyWithKey(property, CONTEXT_KEY)) {
        if (!isStringLiteral(property.value)) {
          throw createFailError(`context value should be a string literal.`);
        }

        context = formatJSString(property.value.value);
      }
    }

    return { message, context };
  }

  return null;
}

function parseIdExpression(expression) {
  let ast;

  try {
    ast = parse(expression);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorWithContext = createParserErrorMessage(expression, error);
      throw createFailError(
        `Couldn't parse angular expression with i18n filter:\n${errorWithContext}`
      );
    }

    throw error;
  }

  for (const node of traverseNodes(ast.program.directives)) {
    if (isDirectiveLiteral(node)) {
      return formatJSString(node.value);
    }
  }

  return null;
}

function trimCurlyBraces(string) {
  return string.slice(2, -2).trim();
}

function* getFilterMessages(htmlContent) {
  const expressions = (htmlContent.match(ANGULAR_EXPRESSION_REGEX) || [])
    .filter(expression => expression.includes(I18N_FILTER_MARKER))
    .map(trimCurlyBraces);

  for (const expression of expressions) {
    const filterStart = expression.indexOf(I18N_FILTER_MARKER);
    const idExpression = expression.slice(0, filterStart).trim();
    const filterObjectExpression = expression.slice(filterStart + I18N_FILTER_MARKER.length).trim();

    if (!filterObjectExpression || !idExpression) {
      throw createFailError(`Cannot parse i18n filter expression: {{ ${expression} }}`);
    }

    const messageId = parseIdExpression(idExpression);

    if (!messageId) {
      throw createFailError(`Empty "id" value in angular filter expression is not allowed.`);
    }

    const { message, context } = parseFilterObjectExpression(filterObjectExpression) || {};

    if (!message) {
      throw createFailError(
        `Empty defaultMessage in angular filter expression is not allowed ("${messageId}").`
      );
    }

    yield [messageId, { message, context }];
  }
}

function* getDirectiveMessages(htmlContent) {
  const $ = cheerio.load(htmlContent);

  const elements = $('[i18n-id]').map(function (idx, el) {
    const $el = $(el);
    return {
      id: $el.attr('i18n-id'),
      defaultMessage: $el.attr('i18n-default-message'),
      context: $el.attr('i18n-context'),
    };
  }).toArray();

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

    yield [messageId, { message, context: formatHTMLString(element.context) || undefined }];
  }
}

export function* extractHtmlMessages(buffer) {
  const content = buffer.toString();
  yield* getDirectiveMessages(content);
  yield* getFilterMessages(content);
}
