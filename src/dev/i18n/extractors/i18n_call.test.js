/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from '@babel/parser';
import { isCallExpression } from '@babel/types';

import { extractI18nCallMessages } from './i18n_call';
import { traverseNodes } from '../utils';

const i18nCallMessageSource = `
i18n('message-id-1', { defaultMessage: 'Default message 1', description: 'Message description 1' });
`;

const translateCallMessageSource = `
i18n.translate('message-id-2', { defaultMessage: 'Default message 2', description: 'Message description 2' });
`;

const i18nCallMessageWithTemplateLiteralSource = `
i18n('message-id-3', { defaultMessage: \`Default
message 3\`, description: \`Message
description 3\` });
`;

describe('dev/i18n/extractors/i18n_call', () => {
  test('extracts "i18n" and "i18n.translate" functions call message', () => {
    let callExpressionNode = [...traverseNodes(parse(i18nCallMessageSource).program.body)].find(
      (node) => isCallExpression(node)
    );

    expect(extractI18nCallMessages(callExpressionNode)).toMatchSnapshot();

    callExpressionNode = [...traverseNodes(parse(translateCallMessageSource).program.body)].find(
      (node) => isCallExpression(node)
    );

    expect(extractI18nCallMessages(callExpressionNode)).toMatchSnapshot();

    callExpressionNode = [
      ...traverseNodes(parse(i18nCallMessageWithTemplateLiteralSource).program.body),
    ].find((node) => isCallExpression(node));

    expect(extractI18nCallMessages(callExpressionNode)).toMatchSnapshot();
  });

  test('throws if message id value is not a string literal', () => {
    const source = `
i18n(messageIdIdentifier, { defaultMessage: 'Default message', description: 'Message description' });
`;
    const callExpressionNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isCallExpression(node)
    );

    expect(() => extractI18nCallMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
  });

  test('throws if properties object is not provided', () => {
    const source = `i18n('message-id');`;
    const callExpressionNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isCallExpression(node)
    );

    expect(() => extractI18nCallMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
  });

  test('throws if defaultMessage is not a string literal', () => {
    const source = `
const message = 'Default message';
i18n('message-id', { defaultMessage: message });
`;
    const callExpressionNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isCallExpression(node)
    );

    expect(() => extractI18nCallMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
  });

  test('throws on empty defaultMessage', () => {
    const source = `i18n('message-id', { defaultMessage: '' });`;
    const callExpressionNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isCallExpression(node)
    );

    expect(() => extractI18nCallMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
  });
});
