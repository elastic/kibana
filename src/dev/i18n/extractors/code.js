/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parse } from '@babel/parser';
import {
  isCallExpression,
  isIdentifier,
  isJSXIdentifier,
  isJSXOpeningElement,
  isMemberExpression,
} from '@babel/types';

import { extractI18nCallMessages } from './i18n_call';
import { createParserErrorMessage, isI18nTranslateFunction, traverseNodes } from '../utils';
import { extractIntlMessages, extractFormattedMessages } from './react';
import { createFailError, isFailError } from '@kbn/dev-utils';

/**
 * Detect Intl.formatMessage() function call (React).
 * @param {Object} node
 * @returns {boolean}
 * @example
 * formatMessage({ id: 'message-id', defaultMessage: 'Message text' });
 * intl.formatMessage({ id: 'message-id', defaultMessage: 'Message text' });
 * props.intl.formatMessage({ id: 'message-id', defaultMessage: 'Message text' });
 * this.props.intl.formatMessage({ id: 'message-id', defaultMessage: 'Message text' });
 */
export function isIntlFormatMessageFunction(node) {
  return (
    isCallExpression(node) &&
    (isIdentifier(node.callee, { name: 'formatMessage' }) ||
      (isMemberExpression(node.callee) &&
        (isIdentifier(node.callee.object, { name: 'intl' }) ||
          isIdentifier(node.callee.object.property, { name: 'intl' })) &&
        isIdentifier(node.callee.property, { name: 'formatMessage' })))
  );
}

/**
 * Detect <FormattedMessage> elements in JSX.
 *
 * Example: `<FormattedMessage id="message-id" defaultMessage="Message text"/>`
 */
export function isFormattedMessageElement(node) {
  return isJSXOpeningElement(node) && isJSXIdentifier(node.name, { name: 'FormattedMessage' });
}

export function* extractCodeMessages(buffer, reporter) {
  let ast;

  try {
    ast = parse(buffer.toString(), {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'objectRestSpread',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'asyncGenerators',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'exportNamespaceFrom',
      ],
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      const errorWithContext = createParserErrorMessage(buffer.toString(), error);
      reporter.report(createFailError(errorWithContext));
      return;
    }
  }

  for (const node of traverseNodes(ast.program.body)) {
    try {
      if (isI18nTranslateFunction(node)) {
        yield extractI18nCallMessages(node);
      } else if (isIntlFormatMessageFunction(node)) {
        yield extractIntlMessages(node);
      } else if (isFormattedMessageElement(node)) {
        yield extractFormattedMessages(node);
      }
    } catch (error) {
      if (!isFailError(error)) {
        throw error;
      }

      reporter.report(error);
    }
  }
}
