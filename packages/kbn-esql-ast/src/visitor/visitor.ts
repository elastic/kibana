/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GlobalVisitorContext, SharedData } from './global_visitor_context';
import { QueryVisitorContext } from './contexts';
import { VisitorContext } from './contexts';
import type {
  AstNodeToVisitorName,
  EnsureFunction,
  ESQLAstExpressionNode,
  UndefinedToVoid,
  VisitorMethods,
} from './types';
import type { ESQLAstQueryExpression, ESQLCommand, ESQLProperNode } from '../types';
import { Builder } from '../builder';

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
  /**
   * Finds the most specific node immediately after the given position. If the
   * position is inside a node, it will return the node itself. If no node is
   * found, it returns `null`.
   *
   * @param ast ES|QL AST
   * @param pos Offset position in the source text
   * @returns The node at or after the given position
   */
  public static readonly findNodeAtOrAfter = (
    ast: ESQLAstQueryExpression,
    pos: number
  ): ESQLProperNode | null => {
    return new Visitor()
      .on('visitExpression', (ctx): ESQLProperNode | null => {
        for (const node of ctx.arguments()) {
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitExpression(node, undefined);
          const isBefore = location.min > pos;
          if (isBefore) return ctx.visitExpression(node, undefined) || node;
        }
        return null;
      })
      .on('visitCommand', (ctx): ESQLProperNode | null => {
        for (const node of ctx.arguments()) {
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitExpression(node);
          const isBefore = location.min > pos;
          if (isBefore) {
            return ctx.visitExpression(node) || node;
          }
        }
        return null;
      })
      .on('visitQuery', (ctx): ESQLProperNode | null => {
        for (const node of ctx.commands()) {
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitCommand(node);
          const isBefore = location.min > pos;
          if (isBefore) return node;
        }
        return null;
      })
      .visitQuery(ast);
  };

  /**
   * Finds the most specific node immediately before the given position. If the
   * position is inside a node, it will return the node itself. If no node is
   * found, it returns `null`.
   *
   * @param ast ES|QL AST
   * @param pos Offset position in the source text
   * @returns The node at or before the given position
   */
  public static readonly findNodeAtOrBefore = (
    ast: ESQLAstQueryExpression,
    pos: number
  ): ESQLProperNode | null => {
    return new Visitor()
      .on('visitExpression', (ctx): ESQLProperNode | null => {
        const nodeLocation = ctx.node.location;
        const nodes = [...ctx.arguments()];

        if (nodeLocation && nodeLocation.max < pos) {
          const last = nodes[nodes.length - 1];
          if (last && last.location && last.location.max === nodeLocation.max) {
            return ctx.visitExpression(last, undefined) || last;
          } else {
            return ctx.node;
          }
        }

        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitExpression(node, undefined);
          const isAfter = location.max < pos;
          if (isAfter) {
            return ctx.visitExpression(node, undefined) || node;
          }
        }

        return null;
      })
      .on('visitCommand', (ctx): ESQLProperNode | null => {
        const nodes = [...ctx.arguments()];
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitExpression(node);
          const isAfter = location.max < pos;
          if (isAfter) {
            if (ctx.node.location && ctx.node.location.max === location.max) {
              return ctx.visitExpression(node) || node;
            }
            return node;
          }
        }
        return null;
      })
      .on('visitQuery', (ctx): ESQLProperNode | null => {
        const nodes = [...ctx.commands()];
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const { location } = node;
          if (!location) continue;
          const isInside = location.min <= pos && location.max >= pos;
          if (isInside) return ctx.visitCommand(node);
          const isAfter = location.max < pos;
          if (isAfter) return ctx.visitCommand(node) || node;
        }
        return null;
      })
      .visitQuery(ast);
  };

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
      throw new Error(`Unsupported node type: ${typeof node}`);
    } else if (node && typeof node === 'object') {
      switch (node.type) {
        case 'query': {
          this.ctx.assertMethodExists('visitQuery');
          return this.ctx.methods.visitQuery!(ctx as any, input) as ReturnType<
            NonNullable<Methods['visitQuery']>
          >;
        }
        case 'command': {
          this.ctx.assertMethodExists('visitCommand');
          return this.ctx.methods.visitCommand!(ctx as any, input) as ReturnType<
            NonNullable<Methods['visitCommand']>
          >;
        }
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
    nodeOrCommands: ESQLAstQueryExpression | ESQLAstQueryExpression['commands'],
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitQuery']>>[1]>
  ) {
    const node = Array.isArray(nodeOrCommands)
      ? Builder.expression.query(nodeOrCommands)
      : nodeOrCommands;
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
