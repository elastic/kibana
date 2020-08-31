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
import { isCallExpression, isJSXOpeningElement, isJSXIdentifier } from '@babel/types';

import { extractIntlMessages, extractFormattedMessages } from './react';
import { traverseNodes } from '../utils';

const intlFormatMessageCallSource = `
const MyComponentContent = ({ intl }) => (
  <input
    type="text"
    placeholder={intl.formatMessage({
      id: 'message-id-1',
      defaultMessage: 'Default message 1',
      description: 'Message description 1'
    })}
  />
);
`;

const formattedMessageElementSource = `
class Component extends PureComponent {
  render() {
    return (
      <p>
        <FormattedMessage
          id="message-id-2"
          defaultMessage="Default message 2"
          description="Message description 2"
        />
      </p>
    );
  }
}
`;

const intlFormatMessageCallErrorSources = [
  `
const messageId = 'message-id'
intl.formatMessage({
  id: messageId,
  defaultMessage: 'Default message',
  description: 'Message description'
});
`,
  `
  const message = 'Default message'
  intl.formatMessage({
    id: 'message-id',
    defaultMessage: message,
    description: 'Message description'
  });
`,
  `
const description = 'Message description'
intl.formatMessage({
  id: 'message-id',
  defaultMessage: 'Default message',
  description: 1
});
`,
];

describe('dev/i18n/extractors/react', () => {
  describe('extractIntlMessages', () => {
    test('extracts messages from "intl.formatMessage" function call', () => {
      const ast = parse(intlFormatMessageCallSource, { plugins: ['jsx'] });
      const expressionNode = [...traverseNodes(ast.program.body)].find((node) =>
        isCallExpression(node)
      );

      expect(extractIntlMessages(expressionNode)).toMatchSnapshot();
    });

    test('throws if message id is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[0];
      const ast = parse(source, { plugins: ['jsx'] });
      const callExpressionNode = [...traverseNodes(ast.program.body)].find((node) =>
        isCallExpression(node)
      );

      expect(() => extractIntlMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
    });

    test('throws if defaultMessage value is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[1];
      const ast = parse(source, { plugins: ['jsx'] });
      const callExpressionNode = [...traverseNodes(ast.program.body)].find((node) =>
        isCallExpression(node)
      );

      expect(() => extractIntlMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
    });

    test('throws if description value is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[2];
      const ast = parse(source, { plugins: ['jsx'] });
      const callExpressionNode = [...traverseNodes(ast.program.body)].find((node) =>
        isCallExpression(node)
      );

      expect(() => extractIntlMessages(callExpressionNode)).toThrowErrorMatchingSnapshot();
    });
  });

  describe('extractFormattedMessages', () => {
    test('extracts messages from "<FormattedMessage>" element', () => {
      const ast = parse(formattedMessageElementSource, { plugins: ['jsx'] });
      const jsxOpeningElementNode = [...traverseNodes(ast.program.body)].find(
        (node) =>
          isJSXOpeningElement(node) && isJSXIdentifier(node.name, { name: 'FormattedMessage' })
      );

      expect(extractFormattedMessages(jsxOpeningElementNode)).toMatchSnapshot();
    });
  });
});
