/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse } from '@babel/parser';
import { isCallExpression, isJSXOpeningElement } from '@babel/types';

import {
  extractCodeMessages,
  isFormattedMessageElement,
  isIntlFormatMessageFunction,
} from './code';
import { traverseNodes } from '../utils';

const extractCodeMessagesSource = Buffer.from(`
i18n('kbn.mgmt.id-1', { defaultMessage: 'Message text 1' });

class Component extends PureComponent {
  render() {
    return (
      <div>
        <FormattedMessage
          id="kbn.mgmt.id-2"
          defaultMessage="Message text 2"
          description="Message description"
        />
        {intl.formatMessage({ id: 'kbn.mgmt.id-3', defaultMessage: 'Message text 3' })}
      </div>
    );
  }
}
`);

const intlFormatMessageSource = `
  formatMessage({ id: 'kbn.mgmt.id-1', defaultMessage: 'Message text 1', description: 'Message description' });
  intl.formatMessage({ id: 'kbn.mgmt.id-2', defaultMessage: 'Message text 2', description: 'Message description' });
  props.intl.formatMessage({ id: 'kbn.mgmt.id-5', defaultMessage: 'Message text 5', description: 'Message description' });
  this.props.intl.formatMessage({ id: 'kbn.mgmt.id-6', defaultMessage: 'Message text 6', description: 'Message description' });
`;

const formattedMessageSource = `
function f() {
  return (
    <FormattedMessage
      id="kbn.mgmt.id-1"
      defaultMessage="Message text 1"
      description="Message description"
    />
  );
}
`;

const report = jest.fn();

describe('dev/i18n/extractors/code', () => {
  beforeEach(() => {
    report.mockClear();
  });

  test('extracts React, server-side and angular service default messages', () => {
    const actual = Array.from(extractCodeMessages(extractCodeMessagesSource));
    expect(actual.sort()).toMatchSnapshot();
  });

  test('throws on empty id', () => {
    const source = Buffer.from(`i18n.translate('', { defaultMessage: 'Default message' });`);
    expect(() => extractCodeMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });

  test('throws on missing defaultMessage', () => {
    const source = Buffer.from(`intl.formatMessage({ id: 'message-id' });`);
    expect(() => extractCodeMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });
});

describe('isIntlFormatMessageFunction', () => {
  test('detects intl.formatMessage call expression', () => {
    const callExpressionNodes = [
      ...traverseNodes(parse(intlFormatMessageSource).program.body),
    ].filter((node) => isCallExpression(node));

    expect(callExpressionNodes).toHaveLength(4);
    expect(
      callExpressionNodes.every((callExpressionNode) =>
        isIntlFormatMessageFunction(callExpressionNode)
      )
    ).toBe(true);
  });
});

describe('isFormattedMessageElement', () => {
  test('detects FormattedMessage jsx element', () => {
    const AST = parse(formattedMessageSource, { plugins: ['jsx'] });
    const jsxOpeningElementNode = [...traverseNodes(AST.program.body)].find((node) =>
      isJSXOpeningElement(node)
    );

    expect(isFormattedMessageElement(jsxOpeningElementNode)).toBe(true);
  });
});
