/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { GlobalVisitorContext, SharedData } from '../global_visitor_context';
// import { ExpressionVisitorContext } from './expression_visitor_context';
import type { ESQLAstNodeWithArgs } from '../../types';
import type {
  ESQLAstExpressionNode,
  UndefinedToVoid,
  VisitorAstNode,
  VisitorMethods,
} from '../types';

const isNodeWithArgs = (x: unknown): x is ESQLAstNodeWithArgs =>
  !!x && typeof x === 'object' && Array.isArray((x as any).args);

export class VisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends VisitorAstNode = VisitorAstNode
> {
  constructor(
    /**
     * Global visitor context.
     */
    public readonly ctx: GlobalVisitorContext<Methods, Data>,

    /**
     * ES|QL AST node which is currently being visited.
     */
    public readonly node: Node,

    /**
     * Context of the parent node, from which the current node was reached
     * during the AST traversal.
     */
    public readonly parent: VisitorContext | null = null
  ) {}

  public *visitArguments(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitExpression']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitExpression']>>> {
    this.ctx.assertMethodExists('visitExpression');

    const node = this.node;

    if (isNodeWithArgs(node)) {
      for (const arg of node.args) {
        const childContext = new ExpressionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitExpression!(childContext, input);
        yield result;
      }
    }
  }
}

export class ExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAstExpressionNode> {}
