/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { forEach, xor, zip } from 'lodash';
import { parse } from '../parse';
import type {
  Ast,
  AstArgument,
  AstArgumentWithMeta,
  AstWithMeta,
  AstFunction,
  AstFunctionWithMeta,
} from './ast';
import { isAst, isAstWithMeta } from './ast';

export interface ValueChange {
  type: 'value';
  source: AstArgumentWithMeta;
  target: AstArgument;
}

export type Change = ValueChange;

export function isValueChange(value: any): value is ValueChange {
  return value?.type === 'value';
}

export function compare(expression: string, ast: Ast): Change[] {
  const astWithMeta = parse(expression, { addMeta: true });
  const queue = [[astWithMeta, ast]] as Array<[typeof astWithMeta, typeof ast]>;
  const changes = [] as Change[];

  function compareExpression(source: AstWithMeta, target: Ast) {
    zip(source.node.chain, target.chain).forEach(([fnWithMeta, fn]) => {
      if (!fnWithMeta || !fn || fnWithMeta?.node.function !== fn?.function) {
        throw Error('Expression changes are not supported.');
      }

      compareFunction(fnWithMeta, fn);
    });
  }

  function compareFunction(source: AstFunctionWithMeta, target: AstFunction) {
    if (xor(Object.keys(source.node.arguments), Object.keys(target.arguments)).length) {
      throw Error('Function changes are not supported.');
    }

    forEach(source.node.arguments, (valuesWithMeta, argument) => {
      const values = target.arguments[argument];

      compareArgument(valuesWithMeta, values);
    });
  }

  function compareArgument(source: AstArgumentWithMeta[], target: AstArgument[]) {
    if (source.length !== target.length) {
      throw Error('Arguments changes are not supported.');
    }

    zip(source, target).forEach(([valueWithMeta, value]) => compareValue(valueWithMeta!, value!));
  }

  function compareValue(source: AstArgumentWithMeta, target: AstArgument) {
    if (isAstWithMeta(source) && isAst(target)) {
      compareExpression(source, target);

      return;
    }

    if (source.node !== target) {
      changes.push({ type: 'value', source, target });
    }
  }

  while (queue.length) {
    compareExpression(...queue.shift()!);
  }

  return changes;
}
