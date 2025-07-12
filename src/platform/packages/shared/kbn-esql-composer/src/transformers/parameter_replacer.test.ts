/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParameterReplacer } from './parameter_replacer';
import { Builder, ESQLColumn } from '@kbn/esql-ast';
import { ESQLParamLiteral, ESQLUnnamedParamLiteral } from '@kbn/esql-ast/src/types';

// Helper to create a param literal node
function createParamLiteral(
  paramType: 'named' | 'positional',
  paramKind: '?' | '??',
  value: string
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

function createColumnWithParam(
  paramType: 'named' | 'positional',
  paramKind: '?' | '??',
  value: string
): ESQLColumn {
  return {
    type: 'column',
    quoted: false,
    incomplete: false,
    args: [createParamLiteral(paramType, paramKind, value)] as ESQLUnnamedParamLiteral[],
    location: { min: 0, max: 0 },
    text: '',
    name: 'test_column',
    parts: ['test_column'],
  };
}

describe('ParameterReplacer', () => {
  it('replaces named parameters in literals', () => {
    const params = { foo: 'bar' };
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('named', '?', 'foo');
    const substituted = replacer.replace(node);

    expect(substituted).toEqual(Builder.expression.literal.string('bar'));
  });

  it('replaces positional parameters in literals', () => {
    const params = ['positional_value'];
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('positional', '?', '0');
    const substituted = replacer.replace(node);

    expect(substituted).toEqual(Builder.expression.literal.string('positional_value'));
  });

  it('returns original node if no parameter found', () => {
    const params = {};
    const replacer = new ParameterReplacer(params);

    const node = createParamLiteral('named', '?', 'missing');
    const substituted = replacer.replace(node);

    expect(substituted).toBe(node);
  });

  it('replaces parameters inside column argument', () => {
    const params = { foo: 'bar' };
    const replacer = new ParameterReplacer(params);

    const node = createColumnWithParam('named', '??', 'foo');

    const substituted = replacer.replace(node);

    expect(substituted.args[0].type).toBe('identifier');
    expect(substituted.args[0].name).toBe('bar');
  });
});
