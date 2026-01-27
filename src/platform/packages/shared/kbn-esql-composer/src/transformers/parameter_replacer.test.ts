/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParameterReplacer } from './parameter_replacer';
import type { ESQLColumn } from '@kbn/esql-language';
import { Builder } from '@kbn/esql-language';
import type {
  ESQLFunction,
  ESQLParamLiteral,
  ESQLUnnamedParamLiteral,
} from '@kbn/esql-language/src/types';

function createParamLiteral(
  paramType: 'named' | 'positional',
  value: string,
  paramKind: '?' | '??' = '?'
): ESQLParamLiteral {
  return {
    type: 'literal',
    literalType: 'param',
    name: '',
    paramKind,
    paramType,
    value,
    location: { min: 0, max: 0 },
    text: '',
    incomplete: false,
  };
}

function createColumnWithParam(paramType: 'named' | 'positional', value: string): ESQLColumn {
  return {
    type: 'column',
    quoted: false,
    incomplete: false,
    args: [createParamLiteral(paramType, value, '??')] as ESQLUnnamedParamLiteral[],
    location: { min: 0, max: 0 },
    text: '',
    name: 'test_column',
    parts: ['test_column'],
  };
}

function createFunctionWithParam(functionName: string): ESQLFunction {
  return {
    name: `?${functionName}`,
    args: [],
    location: { min: 0, max: 0 },
    text: '',
    incomplete: false,
    type: 'function',
  };
}

describe('ParameterReplacer', () => {
  it('replaces named parameters in literals', () => {
    const params = { foo: 'bar' };
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('named', 'foo');
    const substituted = replacer.replace(node);

    expect(substituted).toEqual(Builder.expression.literal.string('bar'));
  });

  it('allows replacing falsy values', () => {
    const params = { baz: 0, qux: false, empty: '' };
    const replacer = new ParameterReplacer(params);

    const zeroNode = createParamLiteral('named', 'baz');
    const falseNode = createParamLiteral('named', 'qux');
    const emptyNode = createParamLiteral('named', 'empty');
    const zeroSubstituted = replacer.replace(zeroNode);
    const falseSubstituted = replacer.replace(falseNode);
    const emptySubstituted = replacer.replace(emptyNode);

    expect(zeroSubstituted).toEqual(Builder.expression.literal.integer(0));
    expect(falseSubstituted).toEqual(Builder.expression.literal.string('false'));
    expect(emptySubstituted).toEqual(Builder.expression.literal.string(''));
  });

  it('replaces positional parameters in literals', () => {
    const params = ['positional_value'];
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('positional', '0');
    const substituted = replacer.replace(node);

    expect(substituted).toEqual(Builder.expression.literal.string('positional_value'));
  });

  it('returns original node if no parameter found', () => {
    const params = {};
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('named', 'missing');
    const substituted = replacer.replace(node);

    expect(substituted).toBe(node);
  });

  it('replaces parameters inside column argument', () => {
    const params = { foo: 'bar' };
    const replacer = new ParameterReplacer(params);

    const node = createColumnWithParam('named', 'foo');

    const substituted = replacer.replace(node);

    expect(substituted.args[0].type).toBe('identifier');
    expect(substituted.args[0].name).toBe('bar');
  });

  it('replaces function name from named parameter', () => {
    const funcNode = createFunctionWithParam('functionName');

    const replacer = new ParameterReplacer({ functionName: 'AVG' });
    const replacedNode = replacer.replace(funcNode);

    expect(replacedNode.name).toBe('AVG');
  });
});
