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
import { parse } from '@babel/parser';
import { isDirectiveLiteral, isObjectExpression } from '@babel/types';

import {
  isPropertyWithKey,
  formatHTMLString,
  formatJSString,
  traverseNodes,
  checkValuesProperty,
  extractMessageValueFromNode,
  extractValuesKeysFromNode,
  extractContextValueFromNode,
} from '../utils';
import { DEFAULT_MESSAGE_KEY, CONTEXT_KEY, VALUES_KEY } from '../constants';
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
function parseFilterObjectExpression(expression, messageId) {
  // parse an object expression instead of block statement
  const nodes = parse(`+${expression}`).program.body;

  for (const node of traverseNodes(nodes)) {
    if (!isObjectExpression(node)) {
      continue;
    }

    const [messageProperty, contextProperty, valuesProperty] = [
      DEFAULT_MESSAGE_KEY,
      CONTEXT_KEY,
      VALUES_KEY,
    ].map(key => node.properties.find(property => isPropertyWithKey(property, key)));

    const message = messageProperty
      ? formatJSString(extractMessageValueFromNode(messageProperty.value, messageId))
      : undefined;

    const context = contextProperty
      ? formatJSString(extractContextValueFromNode(contextProperty.value, messageId))
      : undefined;

    const valuesKeys = valuesProperty
      ? extractValuesKeysFromNode(valuesProperty.value, messageId)
      : undefined;

    return { message, context, valuesKeys };
  }

  return null;
}

function parseIdExpression(expression) {
  for (const node of traverseNodes(parse(expression).program.directives)) {
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

    const { message, context, valuesKeys } =
      parseFilterObjectExpression(filterObjectExpression, messageId) || {};

    if (!message) {
      throw createFailError(
        `Empty defaultMessage in angular filter expression is not allowed ("${messageId}").`
      );
    }

    if (valuesKeys) {
      checkValuesProperty(valuesKeys, message, messageId);
    }

    yield [messageId, { message, context }];
  }
}

function* getDirectiveMessages(htmlContent) {
  const document = jsdom(htmlContent, {
    features: { ProcessExternalResources: false },
  }).defaultView.document;

  for (const element of document.querySelectorAll('[i18n-id]')) {
    const messageId = formatHTMLString(element.getAttribute('i18n-id'));
    if (!messageId) {
      throw createFailError(`Empty "i18n-id" value in angular directive is not allowed.`);
    }

    const message = formatHTMLString(element.getAttribute('i18n-default-message'));
    if (!message) {
      throw createFailError(
        `Empty defaultMessage in angular directive is not allowed ("${messageId}").`
      );
    }

    const context = formatHTMLString(element.getAttribute('i18n-context')) || undefined;

    if (element.hasAttribute('i18n-values')) {
      const nodes = parse(`+${element.getAttribute('i18n-values')}`).program.body;
      const valuesObjectNode = [...traverseNodes(nodes)].find(node => isObjectExpression(node));
      const valuesKeys = extractValuesKeysFromNode(valuesObjectNode);

      checkValuesProperty(valuesKeys, message, messageId);
    }

    yield [messageId, { message, context }];
  }
}

export function* extractHtmlMessages(buffer) {
  const content = buffer.toString();
  yield* getDirectiveMessages(content);
  yield* getFilterMessages(content);
}
