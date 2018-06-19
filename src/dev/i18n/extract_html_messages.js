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

import { jsdom } from 'jsdom';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import {
  isDirectiveLiteral,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import { isPropertyWithKey, escapeLineBreak } from './utils';
import { DEFAULT_MESSAGE_KEY } from './constants';

/**
 * Find all substrings of "{{ any text }}" pattern
 */
const ANGULAR_EXPRESSION_REGEX = /\{\{+([\s\S]*?)\}\}+/g;

/**
 * Extract default message from an angular filter expression argument
 * @param {string} expression JavaScript code containing a filter object
 * @returns {string} Default message
 */
function parseFilterObjectExpression(expression) {
  let message = '';
  let context;

  // parse an object expression instead of block statement
  const filterObjectAST = parse(`+${expression}`);

  traverse(filterObjectAST, {
    enter(path) {
      if (isObjectExpression(path.node)) {
        for (const property of path.node.properties) {
          if (
            isPropertyWithKey(property, DEFAULT_MESSAGE_KEY) &&
            isStringLiteral(property.value)
          ) {
            message = escapeLineBreak(property.value.value);
          }
          if (
            isPropertyWithKey(property, 'context') &&
            isStringLiteral(property.value)
          ) {
            context = property.value.value;
          }
        }
        path.stop();
      }
    },
  });

  return { message, context };
}

function parseIdExpression(expression) {
  let id = '';

  traverse(parse(expression), {
    enter(path) {
      if (isDirectiveLiteral(path.node)) {
        id = path.node.value;
        path.stop();
      }
    },
  });

  return id;
}

function trimCurlyBraces(string) {
  return string.slice(2, -2).trim();
}

function* getFilterMessages(htmlContent) {
  const expressions = (htmlContent.match(ANGULAR_EXPRESSION_REGEX) || [])
    .filter(expression => expression.includes('| i18n: {'))
    .map(trimCurlyBraces);

  for (const expression of expressions) {
    const filterStart = expression.indexOf('| i18n: {');
    const [idExpression] = expression.slice(0, filterStart).trim();
    const [filterObjectExpression] = expression.slice(filterStart + 8).trim();

    if (!filterObjectExpression || !idExpression) {
      throw new Error(
        `Cannot parse i18n filter expression: {{ ${expression} }}`
      );
    }

    const messageId = parseIdExpression(idExpression);
    const { message, context } = parseFilterObjectExpression(
      filterObjectExpression
    );

    yield [messageId, { message, context }];
  }
}

function* getDirectiveMessages(htmlContent) {
  const document = jsdom(htmlContent, {
    features: { ProcessExternalResources: false },
  }).defaultView.document;

  for (const element of document.querySelectorAll('[i18n-id]')) {
    const messageId = element.getAttribute('i18n-id');
    if (!messageId) {
      throw new Error('Empty "i18n-id" value is not allowed.');
    }

    const message = element.getAttribute('i18n-default-message');
    if (!message) {
      throw new Error(`Default message is required for id: ${messageId}.`);
    }

    const context = element.getAttribute('i18n-context');
    yield [messageId, { message, context }];
  }
}

export function* extractHtmlMessages(content) {
  yield* getDirectiveMessages(content.toString());
  yield* getFilterMessages(content.toString());
}
