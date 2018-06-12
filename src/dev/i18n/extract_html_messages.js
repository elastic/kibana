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
  isConditionalExpression,
  isDirectiveLiteral,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import {
  isPropertyWithKey,
  parseConditionalOperatorAST,
  throwEntryException,
} from './utils';
import {
  DEFAULT_MESSAGE_KEY,
  ANGULAR_EXPRESSION_REGEX,
  I18N_FILTER_IDS_REGEX,
  I18N_FILTER_ARGS_REGEX,
} from './constants';

/**
 * Extract default message from an angular filter expression argument
 * @param {string} expression JavaScript code containing a filter object
 * @returns {string} Default message
 */
function parseFilterObjectExpression(expression) {
  let defaultMessage = '';

  const filterObjectAST = parse(`+${expression}`); // parse an object expresssion instead of block statement
  traverse(filterObjectAST, {
    enter(path) {
      if (isObjectExpression(path.node)) {
        for (const property of path.node.properties) {
          if (
            isPropertyWithKey(property, DEFAULT_MESSAGE_KEY) &&
            isStringLiteral(property.value)
          ) {
            defaultMessage = property.value.value;
          }
        }
        path.stop();
      }
    },
  });

  return defaultMessage;
}

function parseConditionalOperatorExpression(expression) {
  const ids = [];

  traverse(parse(expression), {
    enter(path) {
      if (isDirectiveLiteral(path.node)) {
        ids.push(path.node.value);
        path.stop();
      } else if (isConditionalExpression(path.node)) {
        ids.push(...parseConditionalOperatorAST(path.node));
        path.stop();
      }
    },
  });

  return ids;
}

function* getFilterMessages(htmlContent) {
  const expressions = (htmlContent.match(ANGULAR_EXPRESSION_REGEX) || [])
    .filter(
      expression => expression.includes('|') && expression.includes('i18n')
    )
    .map(expression => expression.slice(2, -2).trim()); // remove opening and closing double curly braces

  for (const expression of expressions) {
    const [idsExpression] = expression.match(I18N_FILTER_IDS_REGEX) || [];
    const [filterObjectExpression] =
      expression.match(I18N_FILTER_ARGS_REGEX) || [];

    if (!filterObjectExpression || !idsExpression) {
      throw new Error(
        `Cannot parse i18n filter expression: {{ ${expression} }}`
      );
    }

    const messagesIds = parseConditionalOperatorExpression(idsExpression);
    const messageValue = parseFilterObjectExpression(filterObjectExpression);

    yield* messagesIds.map(id => [id, messageValue]);
  }
}

/**
 * Get messages from i18n-id attribute value.
 * The value can contain a conditional expression in AngularJS curly braces
 * @param {string} attributeValue AngularJS expresssion or an id string
 * @returns {string[]} Array of messages ids
 */
function getMessagesIdsFromHTMLElement(attributeValue) {
  if (!attributeValue) {
    return [];
  }

  const [expression] = attributeValue.match(ANGULAR_EXPRESSION_REGEX) || [];

  if (expression) {
    return parseConditionalOperatorExpression(expression.slice(2, -2).trim());
  }

  return [attributeValue];
}

function* getDirectiveMessages(htmlContent) {
  const document = jsdom(htmlContent, {
    features: { ProcessExternalResources: false },
  }).defaultView.document;

  for (const element of document.getElementsByTagName('*')) {
    if (!element.hasAttribute('i18n-id')) {
      continue;
    }

    const messagesIds = getMessagesIdsFromHTMLElement(
      element.getAttribute('i18n-id')
    );
    if (messagesIds.length === 0) {
      throw new Error('Empty "i18n-id" values are not allowed.');
    }

    const messageValue = element.getAttribute('i18n-default-message');
    if (!messageValue) {
      throw new Error(
        `Default messages are required for ids: ${messagesIds.join(', ')}.`
      );
    }

    yield* messagesIds.map(id => [id, messageValue]);
  }
}

export function* extractHtmlMessages(files) {
  for (const { name, content } of files) {
    try {
      yield* getDirectiveMessages(content);
      yield* getFilterMessages(content);
    } catch (error) {
      throwEntryException(error, name);
    }
  }
}
