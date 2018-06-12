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

import {
  throwEntryException,
} from './utils';
import { extractAngularServiceMessages } from './extract_angular_service_messages';
import {
  extractIntlMessages,
  extractFormattedMessages,
} from './extract_react_messages';

function isI18nTranslateFunction(node) {
  return isCallExpression(node) && isIdentifier(node.callee, { name: 'i18n' });
}

function isIntlFormatMessageFunction(node) {
  return (
    isCallExpression(node) &&
    isMemberExpression(node.callee) &&
    isIdentifier(node.callee.object, { name: 'intl' }) &&
    isIdentifier(node.callee.property, { name: 'formatMessage' })
  );
}

function isFormattedMessageElement(node) {
  return (
    isJSXOpeningElement(node) &&
    isJSXIdentifier(node.name, { name: 'FormattedMessage' })
  );
}

function getMessagesFromJSFile(jsFile) {
  const content = parse(jsFile, {
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
        messagesPairs.push(...extractAngularServiceMessages(path.node));
      }
      if (isIntlFormatMessageFunction(path.node)) {
        messagesPairs.push(...extractIntlMessages(path.node));
      }
      if (isFormattedMessageElement(path.node)) {
        messagesPairs.push(...extractFormattedMessages(path.node));
      }
    },
  });

  return messagesPairs;
}

export function* extractCodeMessages(files) {
  for (const { name, content } of files) {
    try {
      yield* getMessagesFromJSFile(content);
    } catch (error) {
      throwEntryException(error, name);
    }
  }
}
