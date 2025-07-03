/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLProperNode } from '../types';
import { children } from '../visitor/utils';
import { ReducerNodeContext } from './reducer_node_context';

export interface ReducerOptions<U = unknown, D = void> {
  up?: (ctx: ReducerNodeContext, up: U[]) => U;
  down?: (ctx: ReducerNodeContext, down: D) => D;
}

export class Reducer<U = unknown, D = void> {
  constructor(protected readonly options: ReducerOptions<U, D> = {}) {}

  public reduce(
    node: ESQLProperNode,
    down: D
  ): ReducerOptions<U, D>['up'] extends (...args: any) => any ? U : undefined {
    const ctx = new ReducerNodeContext(node, undefined);

    return this.visit(ctx, down);
  }

  protected visit(
    ctx: ReducerNodeContext,
    down: D
  ): ReducerOptions<U, D>['up'] extends (...args: any) => any ? U : undefined {
    const { options } = this;
    const childDown = options.down?.(ctx, down) ?? down;

    const up: U[] = [];

    for (const child of children(ctx.node)) {
      const childCtx = new ReducerNodeContext(child, ctx);
      const result = this.visit(childCtx, childDown);

      if (result !== undefined) {
        up.push(result);
      }
    }

    return options.up?.(ctx, up) as any;
  }
}
