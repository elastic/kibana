/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GlobalVisitorContext, SharedData } from './global_visitor_context';
import { QueryVisitorContext } from './contexts';
import { VisitorContext } from './contexts';
import type {
  AstNodeToVisitorName,
  EnsureFunction,
  ESQLAstExpressionNode,
  ESQLAstQueryNode,
  UndefinedToVoid,
  VisitorMethods,
} from './types';
import { ESQLCommand } from '../types';

export interface VisitorOptions<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> {
  visitors?: Methods;
  data?: Data;
}

export class Visitor<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> {
  public readonly ctx: GlobalVisitorContext<Methods, Data>;

  constructor(protected readonly options: VisitorOptions<Methods, Data> = {}) {
    this.ctx = new GlobalVisitorContext<Methods, Data>(
      options.visitors ?? ({} as Methods),
      options.data ?? ({} as Data)
    );
  }

  public visitors<NewMethods extends VisitorMethods<Methods, Data>>(
    visitors: NewMethods
  ): Visitor<Methods & NewMethods, Data> {
    Object.assign(this.ctx.methods, visitors);
    return this as any;
  }

  public on<
    K extends keyof VisitorMethods<Methods, Data>,
    F extends VisitorMethods<Methods, Data>[K]
  >(visitor: K, fn: F): Visitor<Methods & { [KK in K]: F }, Data> {
    (this.ctx.methods as any)[visitor] = fn;
    return this as any;
  }

  /**
   * Traverse any AST node given any visitor context.
   *
   * @param node AST node to traverse.
   * @param ctx Traversal context.
   * @returns Result of the visitor callback.
   */
  public visit<Ctx extends VisitorContext<Methods, Data>>(
    ctx: Ctx,
    input: UndefinedToVoid<Parameters<NonNullable<Methods[AstNodeToVisitorName<Ctx['node']>]>>[1]>
  ): ReturnType<EnsureFunction<Methods[AstNodeToVisitorName<Ctx['node']>]>> {
    const node = ctx.node;
    if (node instanceof Array) {
      this.ctx.assertMethodExists('visitQuery');
      return this.ctx.methods.visitQuery!(ctx as any, input) as ReturnType<
        NonNullable<Methods['visitQuery']>
      >;
    } else if (node && typeof node === 'object') {
      switch (node.type) {
        case 'command':
          this.ctx.assertMethodExists('visitCommand');
          return this.ctx.methods.visitCommand!(ctx as any, input) as ReturnType<
            NonNullable<Methods['visitCommand']>
          >;
      }
    }
    throw new Error(`Unsupported node type: ${typeof node}`);
  }

  /**
   * Traverse the root node of ES|QL query with default context.
   *
   * @param node Query node to traverse.
   * @param input Input to pass to the first visitor.
   * @returns The result of the query visitor.
   */
  public visitQuery(
    node: ESQLAstQueryNode,
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitQuery']>>[1]>
  ) {
    const queryContext = new QueryVisitorContext(this.ctx, node, null);
    return this.visit(queryContext, input);
  }

  /**
   * Traverse starting from known command node with default context.
   *
   * @param node Command node to traverse.
   * @param input Input to pass to the first visitor.
   * @returns The output of the visitor.
   */
  public visitCommand(
    node: ESQLCommand,
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommand']>>[1]>
  ) {
    this.ctx.assertMethodExists('visitCommand');
    return this.ctx.visitCommand(null, node, input);
  }

  /**
   * Traverse starting from known expression node with default context.
   *
   * @param node Expression node to traverse.
   * @param input Input to pass to the first visitor.
   * @returns The output of the visitor.
   */
  public visitExpression(
    node: ESQLAstExpressionNode,
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitExpression']>>[1]>
  ) {
    this.ctx.assertMethodExists('visitExpression');
    return this.ctx.visitExpression(null, node, input);
  }
}
