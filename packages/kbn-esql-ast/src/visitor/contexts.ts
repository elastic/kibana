/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
// Splitting classes across files runs into issues with circular dependencies
// and makes it harder to understand the code structure.

import { type GlobalVisitorContext, SharedData } from './global_visitor_context';
import { firstItem, singleItems } from './utils';
import type {
  ESQLAstCommand,
  ESQLAstNodeWithArgs,
  ESQLColumn,
  ESQLCommandOption,
  ESQLFunction,
  ESQLNumberLiteral,
  ESQLSource,
} from '../types';
import type {
  ESQLAstExpressionNode,
  ESQLAstQueryNode,
  ExpressionVisitorInput,
  ExpressionVisitorOutput,
  UndefinedToVoid,
  VisitorAstNode,
  VisitorMethods,
} from './types';

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
    input: ExpressionVisitorInput<Methods>
  ): Iterable<ExpressionVisitorOutput<Methods>> {
    this.ctx.assertMethodExists('visitExpression');

    const node = this.node;

    if (!isNodeWithArgs(node)) {
      throw new Error('Node does not have arguments');
    }

    for (const arg of node.args) {
      yield this.visitConcreteExpression(arg, input as any);
    }
  }

  public visitConcreteExpression(
    expression: ESQLAstExpressionNode,
    input: ExpressionVisitorInput<Methods>
  ): ExpressionVisitorOutput<Methods> {
    if (Array.isArray(expression)) {
      throw new Error('not implemented');
    }
    switch (expression.type) {
      case 'column': {
        if (!this.ctx.methods.visitColumn) break;
        return this.ctx.visitColumn(this, expression, input as any);
      }
      case 'source': {
        if (!this.ctx.methods.visitSource) break;
        return this.ctx.visitSource(this, expression, input as any);
      }
      case 'function': {
        if (!this.ctx.methods.visitFunctionCallExpression) break;
        return this.ctx.visitFunctionCallExpression(this, expression, input as any);
      }
    }
    return this.ctx.visitExpression(this, expression, input as any);
  }
}

export class QueryVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAstQueryNode> {
  public *visitCommands(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommand']>>[1]>
  ): Iterable<
    | ReturnType<NonNullable<Methods['visitCommand']>>
    | ReturnType<NonNullable<Methods['visitFromCommand']>>
  > {
    this.ctx.assertMethodExists('visitCommand');

    const methods = this.ctx.methods;

    COMMANDS: for (const cmd of this.node) {
      if (cmd.type === 'command') {
        NAME: switch (cmd.name) {
          case 'from': {
            if (methods.visitFromCommand) {
              const childContext = new FromCommandVisitorContext(this.ctx, cmd, this);
              const result = methods.visitFromCommand!(childContext, input);

              yield result;
              continue COMMANDS;
            }
            break NAME;
          }
          case 'limit': {
            if (methods.visitLimitCommand) {
              const childContext = new LimitCommandVisitorContext(this.ctx, cmd, this);
              const result = methods.visitLimitCommand!(childContext, input);

              yield result;
              continue COMMANDS;
            }
            break NAME;
          }
        }

        const childContext = new CommandVisitorContext(this.ctx, cmd, this);
        const result = methods.visitCommand!(childContext, input);

        yield result as ReturnType<NonNullable<Methods['visitCommand']>>;
      }
    }
  }
}

// Commands --------------------------------------------------------------------

export class CommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLAstCommand = ESQLAstCommand
> extends VisitorContext<Methods, Data, Node> {
  public *visitSources(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitSource']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitSource']>>> {
    this.ctx.assertMethodExists('visitSource');

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'source') {
        const sourceContext = new SourceExpressionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitSource!(sourceContext, input);

        yield result;
      }
    }
  }

  public *visitOptions(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommandOption']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitCommandOption']>>> {
    this.ctx.assertMethodExists('visitCommandOption');

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'option') {
        const sourceContext = new CommandOptionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitCommandOption!(sourceContext, input);

        yield result;
      }
    }
  }
}

export class CommandOptionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLCommandOption> {}

export class FromCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {
  /**
   * Visit the METADATA part of the FROM command.
   *
   *   FROM <sources> [ METADATA <columns> ]
   *
   * @param input Input object to pass to all "visitColumn" children methods.
   * @returns An iterable of results of all the "visitColumn" visitor methods.
   */
  public *visitMetadataColumns(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitColumn']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitColumn']>>> {
    this.ctx.assertMethodExists('visitColumn');

    let metadataOption: ESQLCommandOption | undefined;

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'option' && arg.name === 'metadata') {
        metadataOption = arg;
        break;
      }
    }

    if (!metadataOption) {
      return;
    }

    for (const arg of singleItems(metadataOption.args)) {
      if (arg.type === 'column') {
        const columnContext = new ColumnExpressionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitColumn!(columnContext, input);

        yield result;
      }
    }
  }
}

export class LimitCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data> {
  /**
   * @returns The first numeric literal argument of the command.
   */
  public numericLiteral(): ESQLNumberLiteral | undefined {
    const arg = firstItem(this.node.args);

    if (arg && arg.type === 'literal' && arg.literalType === 'number') {
      return arg;
    }
  }

  /**
   * @returns The value of the first numeric literal argument of the command.
   */
  public numeric(): number | undefined {
    const literal = this.numericLiteral();

    return literal?.value;
  }
}

// Expressions -----------------------------------------------------------------

export class ExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAstExpressionNode> {}

export class ColumnExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLColumn> {}

export class SourceExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLSource> {}

export class FunctionCallExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLFunction> {}
