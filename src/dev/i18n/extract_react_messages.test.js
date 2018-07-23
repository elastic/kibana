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

import { extractIntlMessages, extractFormattedMessages } from './extract_react_messages';
import { traverseNodes } from './utils';

const intlFormatMessageCallSource = `
const MyComponentContent = ({ intl }) => (
  <input
    type="text"
    placeholder={intl.formatMessage({
      id: 'message-id-1',
      defaultMessage: 'Default message 1',
      context: 'Message context 1'
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
          context="Message context 2"
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
  context: 'Message context'
});
`,
  `
  const message = 'Default message'
  intl.formatMessage({
    id: 'message-id',
    defaultMessage: message,
    context: 'Message context'
  });
`,
  `
const context = 'Message context'
intl.formatMessage({
  id: 'message-id',
  defaultMessage: 'Default message',
  context
});
`,
];

describe('dev/i18n/extract_react_messages', () => {
  describe('extractIntlMessages', () => {
    it('extracts messages from "intl.formatMessage" function call', () => {
      const expected = [
        'message-id-1',
        {
          message: 'Default message 1',
          context: 'Message context 1',
        },
      ];

      const ast = parse(intlFormatMessageCallSource, { plugins: ['jsx'] });

      let actual;

      for (const node of traverseNodes(ast.program.body)) {
        if (isCallExpression(node)) {
          actual = extractIntlMessages(node);
          break;
        }
      }

      expect(actual).toEqual(expected);
    });

    it('throws if message id is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[0];
      const ast = parse(source, { plugins: ['jsx'] });

      for (const node of traverseNodes(ast.program.body)) {
        if (isCallExpression(node)) {
          expect(() => extractIntlMessages(node)).toThrow('Message id should be a string literal.');
          break;
        }
      }
    });

    it('throws if defaultMessage value is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[1];
      const ast = parse(source, { plugins: ['jsx'] });

      for (const node of traverseNodes(ast.program.body)) {
        if (isCallExpression(node)) {
          expect(() => extractIntlMessages(node)).toThrow(
            'defaultMessage value should be a string literal for id: message-id.'
          );
          break;
        }
      }
    });

    it('throws if context value is not a string literal', () => {
      const source = intlFormatMessageCallErrorSources[2];
      const ast = parse(source, { plugins: ['jsx'] });

      for (const node of traverseNodes(ast.program.body)) {
        if (isCallExpression(node)) {
          expect(() => extractIntlMessages(node)).toThrow(
            'context value should be a string literal for id: message-id.'
          );
          break;
        }
      }
    });
  });

  describe('extractFormattedMessages', () => {
    it('extracts messages from "<FormattedMessage>" element', () => {
      const expected = [
        'message-id-2',
        {
          message: 'Default message 2',
          context: 'Message context 2',
        },
      ];

      const ast = parse(formattedMessageElementSource, { plugins: ['jsx'] });

      let actual;

      for (const node of traverseNodes(ast.program.body)) {
        if (isJSXOpeningElement(node) && isJSXIdentifier(node.name, { name: 'FormattedMessage' })) {
          actual = extractFormattedMessages(node);
          break;
        }
      }

      expect(actual).toEqual(expected);
    });
  });
});
