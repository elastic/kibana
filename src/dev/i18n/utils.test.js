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
import { isExpressionStatement, isObjectExpression } from '@babel/types';

import { isI18nTranslateFunction, isPropertyWithKey, traverseNodes, formatJSString } from './utils';

const i18nTranslateSources = ['i18n', 'i18n.translate'].map(
  callee => `
${callee}('plugin_1.id_1', {
  values: {
    key: 'value',
  },
  defaultMessage: 'Message text',
  context: 'Message context'
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

  test('should detect i18n translate function call', () => {
    let source = i18nTranslateSources[0];
    let expressionStatementNode = [...traverseNodes(parse(source).program.body)].find(node =>
      isExpressionStatement(node)
    );

    expect(isI18nTranslateFunction(expressionStatementNode.expression)).toBe(true);

    source = i18nTranslateSources[1];
    expressionStatementNode = [...traverseNodes(parse(source).program.body)].find(node =>
      isExpressionStatement(node)
    );

    expect(isI18nTranslateFunction(expressionStatementNode.expression)).toBe(true);
  });

  test('should detect object property with defined key', () => {
    const objectExpresssionNode = [...traverseNodes(parse(objectPropertySource).program.body)].find(
      node => isObjectExpression(node)
    );
    const [objectExpresssionProperty] = objectExpresssionNode.properties;

    expect(isPropertyWithKey(objectExpresssionProperty, 'id')).toBe(true);
    expect(isPropertyWithKey(objectExpresssionProperty, 'not_id')).toBe(false);
  });
});
