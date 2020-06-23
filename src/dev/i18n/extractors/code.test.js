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
