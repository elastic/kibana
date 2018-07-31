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
} from './extract_code_messages';
import { traverseNodes } from './utils';

const extractCodeMessagesSource = Buffer.from(`
i18n('kbn.mgmt.id-1', { defaultMessage: 'Message text 1' });

class Component extends PureComponent {
  render() {
    return (
      <div>
        <FormattedMessage
          id="kbn.mgmt.id-2"
          defaultMessage="Message text 2"
          context="Message context"
        />
        {intl.formatMessage({ id: 'kbn.mgmt.id-3', defaultMessage: 'Message text 3' })}
      </div>
    );
  }
}
`);

const intlFormatMessageSource = `
intl.formatMessage({ id: 'kbn.mgmt.id-1', defaultMessage: 'Message text 1', context: 'Message context' });
`;

const formattedMessageSource = `
function f() {
  return (
    <FormattedMessage
      id="kbn.mgmt.id-1"
      defaultMessage="Message text 1"
      context="Message context"
    />
  );
}
`;

describe('extractCodeMessages', () => {
  test('extracts React, server-side and angular service default messages', () => {
    const actual = Array.from(extractCodeMessages(extractCodeMessagesSource));
    expect(actual.sort()).toMatchSnapshot();
  });

  test('throws on empty id', () => {
    const source = Buffer.from(`i18n.translate('', { defaultMessage: 'Default message' });`);
    expect(() => extractCodeMessages(source).next()).toThrowErrorMatchingSnapshot();
  });

  test('throws on missing defaultMessage', () => {
    const source = Buffer.from(`intl.formatMessage({ id: 'message-id' });`);
    expect(() => extractCodeMessages(source).next()).toThrowErrorMatchingSnapshot();
  });
});

describe('isIntlFormatMessageFunction', () => {
  test('detects intl.formatMessage call expression', () => {
    const callExpressioNode = [...traverseNodes(parse(intlFormatMessageSource).program.body)].find(
      node => isCallExpression(node)
    );

    expect(isIntlFormatMessageFunction(callExpressioNode)).toBe(true);
  });
});

describe('isFormattedMessageElement', () => {
  test('detects FormattedMessage jsx element', () => {
    const AST = parse(formattedMessageSource, { plugins: ['jsx'] });
    const jsxOpeningElementNode = [...traverseNodes(AST.program.body)].find(node =>
      isJSXOpeningElement(node)
    );

    expect(isFormattedMessageElement(jsxOpeningElementNode)).toBe(true);
  });
});
