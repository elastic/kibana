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
import { isExpressionStatement, isObjectExpression, isObjectProperty } from '@babel/types';

import {
  isI18nTranslateFunction,
  isPropertyWithKey,
  traverseNodes,
  formatJSString,
  checkValuesProperty,
  createParserErrorMessage,
  normalizePath,
  extractMessageValueFromNode,
} from './utils';

const i18nTranslateSources = ['i18n', 'i18n.translate'].map(
  (callee) => `
${callee}('plugin_1.id_1', {
  values: {
    key: 'value',
  },
  defaultMessage: 'Message text',
  description: 'Message description'
});
`
);

const objectPropertySource = `
const object = {
  id: 'value',
};
`;

describe('i18n utils', () => {
  test('should remove escaped linebreak', () => {
    expect(formatJSString('Test\\\n str\\\ning')).toEqual('Test string');
  });

  test('should not escape linebreaks', () => {
    expect(
      formatJSString(`Text\n with
   line-breaks
`)
    ).toMatchSnapshot();
  });

  test('should detect i18n translate function call', () => {
    let source = i18nTranslateSources[0];
    let expressionStatementNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isExpressionStatement(node)
    );

    expect(isI18nTranslateFunction(expressionStatementNode.expression)).toBe(true);

    source = i18nTranslateSources[1];
    expressionStatementNode = [...traverseNodes(parse(source).program.body)].find((node) =>
      isExpressionStatement(node)
    );

    expect(isI18nTranslateFunction(expressionStatementNode.expression)).toBe(true);
  });

  test('should detect object property with defined key', () => {
    const objectExpresssionNode = [
      ...traverseNodes(parse(objectPropertySource).program.body),
    ].find((node) => isObjectExpression(node));
    const [objectExpresssionProperty] = objectExpresssionNode.properties;

    expect(isPropertyWithKey(objectExpresssionProperty, 'id')).toBe(true);
    expect(isPropertyWithKey(objectExpresssionProperty, 'not_id')).toBe(false);
  });

  test('should create verbose parser error message', () => {
    expect.assertions(1);

    const content = `function testFunction() {
  const object = {
    object: 'with',
    semicolon: '->';
  };

  return object;
}
`;

    try {
      parse(content);
    } catch (error) {
      expect(createParserErrorMessage(content, error)).toMatchSnapshot();
    }
  });

  test('should normalizePath', () => {
    expect(normalizePath(__dirname)).toMatchSnapshot();
  });

  test('should validate conformity of "values" and "defaultMessage"', () => {
    const valuesKeys = ['url', 'username', 'password'];
    const defaultMessage = 'Test message with {username}, {password} and [markdown link]({url}).';
    const messageId = 'namespace.message.id';

    expect(() => checkValuesProperty(valuesKeys, defaultMessage, messageId)).not.toThrow();
  });

  test('should throw if "values" has a value that is unused in the message', () => {
    const valuesKeys = ['username', 'url', 'password'];
    const defaultMessage = 'Test message with {username} and {password}.';
    const messageId = 'namespace.message.id';

    expect(() =>
      checkValuesProperty(valuesKeys, defaultMessage, messageId)
    ).toThrowErrorMatchingSnapshot();
  });

  test('should throw if some key is missing in "values"', () => {
    const valuesKeys = ['url', 'username'];
    const defaultMessage = 'Test message with {username}, {password} and [markdown link]({url}).';
    const messageId = 'namespace.message.id';

    expect(() =>
      checkValuesProperty(valuesKeys, defaultMessage, messageId)
    ).toThrowErrorMatchingSnapshot();
  });

  test('should throw if "values" property is not provided and defaultMessage requires it', () => {
    const valuesKeys = [];
    const defaultMessage = 'Test message with {username}, {password} and [markdown link]({url}).';
    const messageId = 'namespace.message.id';

    expect(() =>
      checkValuesProperty(valuesKeys, defaultMessage, messageId)
    ).toThrowErrorMatchingSnapshot();
  });

  test(`should throw if "values" property is provided and defaultMessage doesn't include any references`, () => {
    const valuesKeys = ['url', 'username'];
    const defaultMessage = 'Test message';
    const messageId = 'namespace.message.id';

    expect(() =>
      checkValuesProperty(valuesKeys, defaultMessage, messageId)
    ).toThrowErrorMatchingSnapshot();
  });

  test('should parse nested ICU message', () => {
    const valuesKeys = ['first', 'second', 'third'];
    const defaultMessage = 'Test message {first, plural, one {{second}} other {{third}}}';
    const messageId = 'namespace.message.id';

    expect(() => checkValuesProperty(valuesKeys, defaultMessage, messageId)).not.toThrow();
  });

  test(`should throw on wrong nested ICU message`, () => {
    const valuesKeys = ['first', 'second', 'third'];
    const defaultMessage = 'Test message {first, plural, one {{second}} other {other}}';
    const messageId = 'namespace.message.id';

    expect(() =>
      checkValuesProperty(valuesKeys, defaultMessage, messageId)
    ).toThrowErrorMatchingSnapshot();
  });

  test(`should parse string concatenation`, () => {
    const source = `
i18n('namespace.id', {
  defaultMessage: 'Very ' + 'long ' + 'concatenated ' + 'string',
});`;
    const objectProperty = [...traverseNodes(parse(source).program.body)].find((node) =>
      isObjectProperty(node)
    );

    expect(extractMessageValueFromNode(objectProperty.value)).toMatchSnapshot();
  });
});
