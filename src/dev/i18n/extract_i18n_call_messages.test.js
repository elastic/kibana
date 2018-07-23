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
import { isCallExpression } from '@babel/types';

import { extractI18nCallMessages } from './extract_i18n_call_messages';
import { traverseNodes } from './utils';

const i18nCallMessageSource = `
i18n('message-id-1', { defaultMessage: 'Default message 1', context: 'Message context 1' });
`;

const translateCallMessageSource = `
i18n.translate('message-id-2', { defaultMessage: 'Default message 2', context: 'Message context 2' });
`;

describe('extractI18nCallMessages', () => {
  it('extracts "i18n" and "i18n.translate" functions call message', () => {
    for (const node of traverseNodes(parse(i18nCallMessageSource).program.body)) {
      if (isCallExpression(node)) {
        const actual = extractI18nCallMessages(node);
        const expected = [
          'message-id-1',
          {
            message: 'Default message 1',
            context: 'Message context 1',
          },
        ];

        expect(actual).toEqual(expected);
        break;
      }
    }

    for (const node of traverseNodes(parse(translateCallMessageSource).program.body)) {
      if (isCallExpression(node)) {
        const actual = extractI18nCallMessages(node);
        const expected = [
          'message-id-2',
          {
            message: 'Default message 2',
            context: 'Message context 2',
          },
        ];

        expect(actual).toEqual(expected);
        break;
      }
    }
  });

  it('throws if message id value is not a string literal', () => {
    const source = `
i18n(messageIdIdentifier, { defaultMessage: 'Default message', context: 'Message context' });
`;

    for (const node of traverseNodes(parse(source).program.body)) {
      if (isCallExpression(node)) {
        expect(() => extractI18nCallMessages(node)).toThrow(
          `Message id should be a string literal.`
        );
        break;
      }
    }
  });

  it('throws if properties object is not provided', () => {
    for (const node of traverseNodes(parse(`i18n('message-id');`).program.body)) {
      if (isCallExpression(node)) {
        expect(() => extractI18nCallMessages(node)).toThrow(
          `Cannot parse "message-id" message: object with defaultMessage property is not provided.`
        );
        break;
      }
    }
  });

  it('throws if defaultMessage is not a string literal', () => {
    const source = `
const message = 'Default message';
i18n('message-id', { defaultMessage: message });
`;

    for (const node of traverseNodes(parse(source).program.body)) {
      if (isCallExpression(node)) {
        expect(() => extractI18nCallMessages(node)).toThrow(
          `Cannot parse "message-id" message: defaultMessage value should be a string literal.`
        );
        break;
      }
    }
  });

  it('throws on empty defaultMessage', () => {
    const source = `i18n('message-id', { defaultMessage: '' });`;

    for (const node of traverseNodes(parse(source).program.body)) {
      if (isCallExpression(node)) {
        expect(() => extractI18nCallMessages(node)).toThrow(
          `Cannot parse "message-id" message: defaultMessage is required`
        );
        break;
      }
    }
  });
});
