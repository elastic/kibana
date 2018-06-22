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

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  isCallExpression,
  isIdentifier,
  isJSXIdentifier,
  isJSXOpeningElement,
  isMemberExpression,
} from '@babel/types';

import { extractI18nCallMessages } from './extract_i18n_call_messages';
import {
  extractIntlMessages,
  extractFormattedMessages,
} from './extract_react_messages';

/**
 * Detect angular i18n service call or from `@kbn/i18n` translate function call.
 *
 * Service call example: `i18n('message-id', { defaultMessage: 'Message text'})`
 *
 * `@kbn/i18n` example: `i18n.translate('message-id', { defaultMessage: 'Message text'})`
 */
function isI18nTranslateFunction(node) {
  return (
    isCallExpression(node) &&
    (isIdentifier(node.callee, { name: 'i18n' }) ||
      isIdentifier(node.callee, { name: 'translate' }))
  );
}

/**
 * Detect Intl.formatMessage() function call (React).
 *
 * Example: `intl.formatMessage({ id: 'message-id', defaultMessage: 'Message text' });`
 */
function isIntlFormatMessageFunction(node) {
  return (
    isCallExpression(node) &&
    isMemberExpression(node.callee) &&
    isIdentifier(node.callee.object, { name: 'intl' }) &&
    isIdentifier(node.callee.property, { name: 'formatMessage' })
  );
}

/**
 * Detect <FormattedMessage> elements in JSX.
 *
 * Example: `<FormattedMessage id="message-id" defaultMessage="Message text"/>`
 */
function isFormattedMessageElement(node) {
  return (
    isJSXOpeningElement(node) &&
    isJSXIdentifier(node.name, { name: 'FormattedMessage' })
  );
}

export function extractCodeMessages(buffer) {
  const content = parse(buffer.toString(), {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'objectRestSpread',
      'classProperties',
      'asyncGenerators',
    ],
  });

  const messagesPairs = [];
  traverse(content, {
    enter(path) {
      if (isI18nTranslateFunction(path.node)) {
        messagesPairs.push(extractI18nCallMessages(path.node));
      } else if (isIntlFormatMessageFunction(path.node)) {
        messagesPairs.push(extractIntlMessages(path.node));
      } else if (isFormattedMessageElement(path.node)) {
        messagesPairs.push(extractFormattedMessages(path.node));
      }
    },
  });

  return messagesPairs;
}
