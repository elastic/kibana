/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type SpecialFunctionName = 'case' | 'count' | 'bucket';
export type SpecialCommandName = 'stats' | 'inline stats' | 'sort' | 'enrich' | 'where' | 'eval';

export function isFunction(
  name: string,
  expected: SpecialFunctionName
): name is SpecialFunctionName {
  return name.toLowerCase() === expected;
}

export function isCommand(name: string, expected: SpecialCommandName): name is SpecialCommandName {
  return name.toLowerCase() === expected.toLowerCase();
}

export function ensureKeywordAndText(types: import('../../../types').FunctionParameterType[]) {
  if (types.includes('keyword') && !types.includes('text')) {
    types.push('text');
  }

  if (types.includes('text') && !types.includes('keyword')) {
    types.push('keyword');
  }

  return types;
}
