/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
// Splitting classes across files runs into issues with circular dependencies
// and makes it harder to understand the code structure.

import type { SharedData } from './global_visitor_context';
import { type GlobalVisitorContext } from './global_visitor_context';
import { children, firstItem, singleItems } from './utils';
import type {
  ESQLAstChangePointCommand,
  ESQLAstCommand,
  ESQLAstExpression,
  ESQLAstHeaderCommand,
  ESQLAstItem,
  ESQLAstJoinCommand,
  ESQLAstQueryExpression,
  ESQLAstRerankCommand,
  ESQLColumn,
  ESQLCommandOption,
  ESQLDecimalLiteral,
  ESQLFunction,
  ESQLIdentifier,
  ESQLInlineCast,
  ESQLIntegerLiteral,
  ESQLList,
  ESQLLiteral,
  ESQLMap,
  ESQLMapEntry,
  ESQLOrderExpression,
  ESQLParens,
  ESQLSource,
} from '../../types';
import type {
  CommandVisitorInput,
  ESQLAstExpressionNode,
  ESQLAstQueryNode,
  ExpressionVisitorOutput,
  UndefinedToVoid,
  VisitorAstNode,
  VisitorInput,
  VisitorMethods,
  VisitorOutput,
} from './types';
import { Builder } from '../builder';
import { isProperNode } from '../is';

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
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>)
  ): Iterable<VisitorOutput<Methods, 'visitExpression'>> {
    this.ctx.assertMethodExists('visitExpression');

    for (const arg of this.arguments()) {
      if (!arg) continue;
      if (arg.type === 'option') {
        continue;
      }
      yield this.visitExpression(
        arg,
        typeof input === 'function'
          ? (input as () => VisitorInput<Methods, 'visitExpression'>)()
          : (input as VisitorInput<Methods, 'visitExpression'>)
      );
    }
  }

  public arguments(): ESQLAstExpressionNode[] {
    const node = this.node;

    if (!isProperNode(node)) {
      return [];
    }

    const args: ESQLAstExpressionNode[] = [];

    for (const arg of children(node)) {
      args.push(arg as ESQLAstExpression);
    }

    return args;
  }

  public visitArgument(
    index: number,
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.ctx.assertMethodExists('visitExpression');

    const node = this.node;

    if (!isProperNode(node)) {
      throw new Error('Node does not have arguments');
    }

    let i = 0;
    for (const arg of this.arguments()) {
      if (i === index) {
        return this.visitExpression(arg, input as any);
      }
      i++;
    }

    throw new Error(`Argument at index ${index} not found`);
  }

  public visitExpression(
    expressionNode: ESQLAstExpressionNode,
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    return this.ctx.visitExpression(this, expressionNode, input);
  }

  public visitCommand(
    commandNode: ESQLAstCommand,
    input: CommandVisitorInput<Methods>
  ): ExpressionVisitorOutput<Methods> {
    return this.ctx.visitCommand(this, commandNode, input);
  }

  public visitHeaderCommand(
    headerCommandNode: ESQLAstHeaderCommand,
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitHeaderCommand']>>[1]>
  ): ReturnType<NonNullable<Methods['visitHeaderCommand']>> {
    return this.ctx.visitHeaderCommand(this, headerCommandNode, input);
  }
}

export class QueryVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLAstQueryNode> {
  public *headerCommands(): Iterable<ESQLAstHeaderCommand> {
    if (this.node.header) {
      yield* this.node.header;
    }
  }

  public *visitHeaderCommands(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitHeaderCommand']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitHeaderCommand']>>> {
    this.ctx.assertMethodExists('visitHeaderCommand');

    if (this.node.header) {
      for (const headerCmd of this.node.header) {
        yield this.visitHeaderCommand(headerCmd, input as any);
      }
    }
  }

  public *commands(): Iterable<ESQLAstCommand> {
    yield* this.node.commands;
  }

  public *visitCommands(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommand']>>[1]>
  ): Iterable<
    | ReturnType<NonNullable<Methods['visitCommand']>>
    | ReturnType<NonNullable<Methods['visitFromCommand']>>
  > {
    this.ctx.assertMethodExists('visitCommand');

    for (const cmd of this.node.commands) {
      yield this.visitCommand(cmd, input as any);
    }
  }
}

// Commands --------------------------------------------------------------------

export class CommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLAstCommand = ESQLAstCommand
> extends VisitorContext<Methods, Data, Node> {
  public name(): string {
    return this.node.name.toUpperCase();
  }

  public *options(): Iterable<ESQLCommandOption> {
    for (const arg of this.node.args) {
      if (!arg || Array.isArray(arg)) {
        continue;
      }
      if (arg.type === 'option') {
        yield arg;
      }
    }
  }

  public *visitOptions(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitCommandOption']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitCommandOption']>>> {
    this.ctx.assertMethodExists('visitCommandOption');

    for (const option of this.options()) {
      const sourceContext = new CommandOptionVisitorContext(this.ctx, option, this);
      const result = this.ctx.methods.visitCommandOption!(sourceContext, input);

      yield result;
    }
  }

  public *args(option: '' | string = ''): Iterable<ESQLAstItem> {
    option = option.toLowerCase();

    if (!option) {
      for (const arg of this.node.args) {
        if (!arg) {
          continue;
        }
        if (Array.isArray(arg)) {
          yield arg;
          continue;
        }
        if (arg.type !== 'option') {
          yield arg;
        }
      }
    }

    const optionNode = this.node.args.find(
      (arg) => !Array.isArray(arg) && arg && arg.type === 'option' && arg.name === option
    );

    if (optionNode) {
      yield* (optionNode as ESQLCommandOption).args;
    }
  }

  public *visitArgs(
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>),
    option: '' | string = ''
  ): Iterable<ExpressionVisitorOutput<Methods>> {
    this.ctx.assertMethodExists('visitExpression');

    for (const arg of singleItems(this.args(option))) {
      yield this.visitExpression(
        arg,
        typeof input === 'function'
          ? (input as () => VisitorInput<Methods, 'visitExpression'>)()
          : (input as VisitorInput<Methods, 'visitExpression'>)
      );
    }
  }

  public *visitSources(
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitSourceExpression']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitSourceExpression']>>> {
    this.ctx.assertMethodExists('visitSourceExpression');

    for (const arg of singleItems(this.node.args)) {
      if (arg.type === 'source') {
        const sourceContext = new SourceExpressionVisitorContext(this.ctx, arg, this);
        const result = this.ctx.methods.visitSourceExpression!(sourceContext, input);

        yield result;
      }
    }
  }

  public visitSubQuery(queryNode: ESQLAstQueryExpression) {
    this.ctx.assertMethodExists('visitQuery');
    return this.ctx.visitQuery(this, queryNode, undefined as any);
  }

  public *visitSubQueries() {
    this.ctx.assertMethodExists('visitQuery');
    for (const arg of this.node.args) {
      if (!arg || Array.isArray(arg)) {
        continue;
      }

      if (arg.type === 'query' && 'commands' in arg) {
        const result = this.visitSubQuery(arg);
        yield result;
      }
    }
  }
}

export class HeaderCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLAstHeaderCommand = ESQLAstHeaderCommand
> extends VisitorContext<Methods, Data, Node> {
  public name(): string {
    return this.node.name.toUpperCase();
  }

  public *args(): Iterable<ESQLAstExpression> {
    yield* this.node.args;
  }

  public *visitArgs(
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>)
  ): Iterable<ExpressionVisitorOutput<Methods>> {
    this.ctx.assertMethodExists('visitExpression');

    for (const arg of this.args()) {
      yield this.visitExpression(
        arg,
        typeof input === 'function'
          ? (input as () => VisitorInput<Methods, 'visitExpression'>)()
          : (input as VisitorInput<Methods, 'visitExpression'>)
      );
    }
  }
}

export class CommandOptionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLCommandOption> {}

// FROM <sources> [ METADATA <columns> ]
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
    input: UndefinedToVoid<Parameters<NonNullable<Methods['visitColumnExpression']>>[1]>
  ): Iterable<ReturnType<NonNullable<Methods['visitColumnExpression']>>> {
    this.ctx.assertMethodExists('visitColumnExpression');

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
        const result = this.ctx.methods.visitColumnExpression!(columnContext, input);

        yield result;
      }
    }
  }
}

// LIMIT <literal>
export class LimitCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data> {
  /**
   * @returns The first numeric literal argument of the command.
   */
  public numericLiteral(): ESQLIntegerLiteral | ESQLDecimalLiteral | undefined {
    const arg = firstItem(this.node.args);

    if (
      arg &&
      arg.type === 'literal' &&
      (arg.literalType === 'integer' || arg.literalType === 'double')
    ) {
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

  public setLimit(value: number): void {
    const literalNode = Builder.expression.literal.numeric({ value, literalType: 'integer' });

    this.node.args = [literalNode];
  }
}

// EXPLAIN <query>
export class ExplainCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// ROW <columns>
export class RowCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// TS
export class TimeseriesCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// SHOW <identifier>
export class ShowCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// META <identifier>
export class MetaCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// EVAL <columns>
export class EvalCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// STATS <columns> [ BY <columns> ]
export class StatsCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// INLINESTATS <columns> [ BY <columns> ]
export class InlineStatsCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// LOOKUP <source> ON <column>
export class LookupCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// KEEP <columns>
export class KeepCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// SORT <columns>
export class SortCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// WHERE <expression>
export class WhereCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// DROP <columns>
export class DropCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// RENAME <column> AS <column>
export class RenameCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// DISSECT <column> <string> [ APPEND_SEPARATOR = <string> ]
export class DissectCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// GROK <column> <string> [ , <string> ... ]
export class GrokCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// ENRICH <column> [ ON <column> ] [ WITH <columns> ]
export class EnrichCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// MV_EXPAND <column>
export class MvExpandCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// <LOOKUP | LEFT | RIGHT> JOIN <target> ON <condition>
export class JoinCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstJoinCommand> {}

// RERANK <query> ON field [, field ...] WITH <inference-id>
export class RerankCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstRerankCommand> {}

// CHANGE_POINT <value> [ ON <key> ] [ AS <targetType>, <targetPvalue> ]
export class ChangePointCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstChangePointCommand> {}

// FORK (COMMAND ... [| COMMAND ...]) [(COMMAND ... [| COMMAND ...])]
export class ForkCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// COMPLETION
export class CompletionCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// SAMPLE <probability> [SEED <seed>]
export class SampleCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// FUSE
export class FuseCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// MMR
export class MmrCommandVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends CommandVisitorContext<Methods, Data, ESQLAstCommand> {}

// Expressions -----------------------------------------------------------------

export class ExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLAstExpressionNode = ESQLAstExpressionNode
> extends VisitorContext<Methods, Data, Node> {}

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
> extends VisitorContext<Methods, Data, ESQLFunction> {
  /**
   * @returns Returns a printable uppercase function name or operator.
   */
  public operator(): string {
    const operator = this.node.name;

    switch (operator) {
      case 'note_like': {
        return 'NOT LIKE';
      }
      case 'not_rlike': {
        return 'NOT RLIKE';
      }
    }

    return operator.toUpperCase();
  }
}

export class LiteralExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLLiteral = ESQLLiteral
> extends ExpressionVisitorContext<Methods, Data, Node> {}

export class ListLiteralExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData,
  Node extends ESQLList = ESQLList
> extends ExpressionVisitorContext<Methods, Data, Node> {
  public *visitElements(
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>)
  ): Iterable<ExpressionVisitorOutput<Methods>> {
    this.ctx.assertMethodExists('visitExpression');

    for (const value of this.node.values) {
      yield this.visitExpression(value, typeof input === 'function' ? (input as any)() : input);
    }
  }
}

export class InlineCastExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends ExpressionVisitorContext<Methods, Data, ESQLInlineCast> {
  public value(): ESQLAstExpression {
    this.ctx.assertMethodExists('visitExpression');

    const value = firstItem([this.node.value])!;

    return value;
  }

  public visitValue(
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.ctx.assertMethodExists('visitExpression');

    return this.visitExpression(this.value(), input as any);
  }
}

export class OrderExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLOrderExpression> {}

export class IdentifierExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLIdentifier> {}

export class MapExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLMap> {
  public *visitEntries(
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>)
  ): Iterable<ExpressionVisitorOutput<Methods>> {
    this.ctx.assertMethodExists(['visitExpression', 'visitMapEntryExpression']);

    for (const value of this.node.entries) {
      yield this.visitExpression(value, typeof input === 'function' ? (input as any)() : input);
    }
  }

  public *visitArguments(
    input:
      | VisitorInput<Methods, 'visitExpression'>
      | (() => VisitorInput<Methods, 'visitExpression'>)
  ): Iterable<VisitorOutput<Methods, 'visitExpression'>> {
    return yield* this.visitEntries(input);
  }
}

export class MapEntryExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLMapEntry> {
  public key(): ESQLAstExpression {
    return this.node.key;
  }

  public value(): ESQLAstExpression {
    return this.node.value;
  }

  public visitKey(
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.ctx.assertMethodExists('visitExpression');

    return this.visitExpression(this.key(), input as any);
  }

  public visitValue(
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.ctx.assertMethodExists('visitExpression');

    return this.visitExpression(this.value(), input as any);
  }
}

export class ParensExpressionVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> extends VisitorContext<Methods, Data, ESQLParens> {
  public child(): ESQLAstExpression {
    return this.node.child;
  }

  public visitChild(
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.ctx.assertMethodExists('visitExpression');

    return this.visitExpression(this.child(), input as any);
  }
}
