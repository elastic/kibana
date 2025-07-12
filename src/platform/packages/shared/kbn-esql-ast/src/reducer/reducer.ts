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
  public static readonly reduce = <Up = unknown, Down = void>(
    tree: ESQLProperNode,
    options: ReducerOptions<Up, Down>,
    down?: Down
  ) => {
    const reducer = new Reducer<Up, Down>(options);
    return reducer.reduce(tree, down!);
  };

  protected aborted: boolean = false;

  constructor(protected readonly options: ReducerOptions<U, D> = {}) {}

  public reduce(
    node: ESQLProperNode,
    down: D
  ): ReducerOptions<U, D>['up'] extends (...args: any) => any ? U : undefined {
    const ctx = new ReducerNodeContext(this, node, undefined);

    return this.visit(ctx, down);
  }

  public abort(): void {
    this.aborted = true;
  }

  protected visit(
    ctx: ReducerNodeContext,
    down: D
  ): ReducerOptions<U, D>['up'] extends (...args: any) => any ? U : undefined {
    if (this.aborted) return;

    const { options } = this;
    const childDown = options.down?.(ctx, down) ?? down;

    const up: U[] = [];

    for (const child of children(ctx.node)) {
      const childCtx = new ReducerNodeContext(this, child, ctx);
      const result = this.visit(childCtx, childDown);

      if (result !== undefined) {
        up.push(result);
      }
    }

    return options.up?.(ctx, up) as any;
  }
}
