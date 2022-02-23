/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Ast } from './ast';
import { isAstWithMeta } from './ast';
import type { Change, ValueChange } from './compare';
import { compare, isValueChange } from './compare';
import { toExpression } from './to_expression';

export function patch(expression: string, ast: Ast): string {
  let result = '';
  let position = 0;

  function apply(change: Change) {
    if (isValueChange(change)) {
      return void patchValue(change);
    }

    throw new Error('Cannot apply patch for the change.');
  }

  function patchValue(change: ValueChange) {
    if (isAstWithMeta(change.source)) {
      throw new Error('Patching sub-expressions is not supported.');
    }

    result += `${expression.substring(position, change.source.start)}${toExpression(
      change.target,
      'argument'
    )}`;

    position = change.source.end;
  }

  compare(expression, ast)
    .sort(({ source: source1 }, { source: source2 }) => source1.start - source2.start)
    .forEach(apply);

  result += expression.substring(position);

  return result;
}
