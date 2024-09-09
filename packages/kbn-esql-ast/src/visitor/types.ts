/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SharedData } from './global_visitor_context';
import type * as ast from '../types';
import type * as contexts from './contexts';

/**
 * We don't have a dedicated "query" AST node, so - for now - we use the root
 * array of commands as the "query" node.
 */
export type ESQLAstQueryNode = ast.ESQLAst;

/**
 * Represents an "expression" node in the AST.
 */
// export type ESQLAstExpressionNode = ESQLAstItem;
export type ESQLAstExpressionNode = ast.ESQLSingleAstItem;

/**
 * All possible AST nodes supported by the visitor.
 */
export type VisitorAstNode = ESQLAstQueryNode | ast.ESQLAstNode;

export type Visitor<Ctx extends contexts.VisitorContext, Input = unknown, Output = unknown> = (
  ctx: Ctx,
  input: Input
) => Output;

/**
 * Retrieves the `Input` of a {@link Visitor} function.
 */
export type VisitorInput<
  Methods extends VisitorMethods,
  Method extends keyof Methods
> = UndefinedToVoid<Parameters<EnsureFunction<NonNullable<Methods[Method]>>>[1]>;

/**
 * Retrieves the `Output` of a {@link Visitor} function.
 */
export type VisitorOutput<
  Methods extends VisitorMethods,
  Method extends keyof Methods
> = ReturnType<EnsureFunction<NonNullable<Methods[Method]>>>;

/**
 * Input that satisfies any expression visitor input constraints.
 */
export type ExpressionVisitorInput<Methods extends VisitorMethods> = AnyToVoid<
  | VisitorInput<Methods, 'visitExpression'> &
      VisitorInput<Methods, 'visitColumnExpression'> &
      VisitorInput<Methods, 'visitSourceExpression'> &
      VisitorInput<Methods, 'visitFunctionCallExpression'> &
      VisitorInput<Methods, 'visitLiteralExpression'> &
      VisitorInput<Methods, 'visitListLiteralExpression'> &
      VisitorInput<Methods, 'visitTimeIntervalLiteralExpression'> &
      VisitorInput<Methods, 'visitInlineCastExpression'> &
      VisitorInput<Methods, 'visitRenameExpression'>
>;

/**
 * Input that satisfies any expression visitor output constraints.
 */
export type ExpressionVisitorOutput<Methods extends VisitorMethods> =
  | VisitorOutput<Methods, 'visitExpression'>
  | VisitorOutput<Methods, 'visitColumnExpression'>
  | VisitorOutput<Methods, 'visitSourceExpression'>
  | VisitorOutput<Methods, 'visitFunctionCallExpression'>
  | VisitorOutput<Methods, 'visitLiteralExpression'>
  | VisitorOutput<Methods, 'visitListLiteralExpression'>
  | VisitorOutput<Methods, 'visitTimeIntervalLiteralExpression'>
  | VisitorOutput<Methods, 'visitInlineCastExpression'>
  | VisitorOutput<Methods, 'visitRenameExpression'>;

/**
 * Input that satisfies any command visitor input constraints.
 */
export type CommandVisitorInput<Methods extends VisitorMethods> = AnyToVoid<
  | VisitorInput<Methods, 'visitCommand'> &
      VisitorInput<Methods, 'visitFromCommand'> &
      VisitorInput<Methods, 'visitLimitCommand'> &
      VisitorInput<Methods, 'visitExplainCommand'> &
      VisitorInput<Methods, 'visitRowCommand'> &
      VisitorInput<Methods, 'visitMetricsCommand'> &
      VisitorInput<Methods, 'visitShowCommand'> &
      VisitorInput<Methods, 'visitMetaCommand'> &
      VisitorInput<Methods, 'visitEvalCommand'> &
      VisitorInput<Methods, 'visitStatsCommand'> &
      VisitorInput<Methods, 'visitInlineStatsCommand'> &
      VisitorInput<Methods, 'visitLookupCommand'> &
      VisitorInput<Methods, 'visitKeepCommand'> &
      VisitorInput<Methods, 'visitSortCommand'> &
      VisitorInput<Methods, 'visitWhereCommand'> &
      VisitorInput<Methods, 'visitDropCommand'> &
      VisitorInput<Methods, 'visitRenameCommand'> &
      VisitorInput<Methods, 'visitDissectCommand'> &
      VisitorInput<Methods, 'visitGrokCommand'> &
      VisitorInput<Methods, 'visitEnrichCommand'> &
      VisitorInput<Methods, 'visitMvExpandCommand'>
>;

/**
 * Input that satisfies any command visitor output constraints.
 */
export type CommandVisitorOutput<Methods extends VisitorMethods> =
  | VisitorOutput<Methods, 'visitCommand'>
  | VisitorOutput<Methods, 'visitFromCommand'>
  | VisitorOutput<Methods, 'visitLimitCommand'>
  | VisitorOutput<Methods, 'visitExplainCommand'>
  | VisitorOutput<Methods, 'visitRowCommand'>
  | VisitorOutput<Methods, 'visitMetricsCommand'>
  | VisitorOutput<Methods, 'visitShowCommand'>
  | VisitorOutput<Methods, 'visitMetaCommand'>
  | VisitorOutput<Methods, 'visitEvalCommand'>
  | VisitorOutput<Methods, 'visitStatsCommand'>
  | VisitorOutput<Methods, 'visitInlineStatsCommand'>
  | VisitorOutput<Methods, 'visitLookupCommand'>
  | VisitorOutput<Methods, 'visitKeepCommand'>
  | VisitorOutput<Methods, 'visitSortCommand'>
  | VisitorOutput<Methods, 'visitWhereCommand'>
  | VisitorOutput<Methods, 'visitDropCommand'>
  | VisitorOutput<Methods, 'visitRenameCommand'>
  | VisitorOutput<Methods, 'visitDissectCommand'>
  | VisitorOutput<Methods, 'visitGrokCommand'>
  | VisitorOutput<Methods, 'visitEnrichCommand'>
  | VisitorOutput<Methods, 'visitMvExpandCommand'>;

export interface VisitorMethods<
  Visitors extends VisitorMethods = any,
  Data extends SharedData = SharedData
> {
  visitQuery?: Visitor<contexts.QueryVisitorContext<Visitors, Data>, any, any>;
  visitCommand?: Visitor<contexts.CommandVisitorContext<Visitors, Data>, any, any>;
  visitFromCommand?: Visitor<contexts.FromCommandVisitorContext<Visitors, Data>, any, any>;
  visitLimitCommand?: Visitor<contexts.LimitCommandVisitorContext<Visitors, Data>, any, any>;
  visitExplainCommand?: Visitor<contexts.ExplainCommandVisitorContext<Visitors, Data>, any, any>;
  visitRowCommand?: Visitor<contexts.RowCommandVisitorContext<Visitors, Data>, any, any>;
  visitMetricsCommand?: Visitor<contexts.MetricsCommandVisitorContext<Visitors, Data>, any, any>;
  visitShowCommand?: Visitor<contexts.ShowCommandVisitorContext<Visitors, Data>, any, any>;
  visitMetaCommand?: Visitor<contexts.MetaCommandVisitorContext<Visitors, Data>, any, any>;
  visitEvalCommand?: Visitor<contexts.EvalCommandVisitorContext<Visitors, Data>, any, any>;
  visitStatsCommand?: Visitor<contexts.StatsCommandVisitorContext<Visitors, Data>, any, any>;
  visitInlineStatsCommand?: Visitor<
    contexts.InlineStatsCommandVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitLookupCommand?: Visitor<contexts.LookupCommandVisitorContext<Visitors, Data>, any, any>;
  visitKeepCommand?: Visitor<contexts.KeepCommandVisitorContext<Visitors, Data>, any, any>;
  visitSortCommand?: Visitor<contexts.SortCommandVisitorContext<Visitors, Data>, any, any>;
  visitWhereCommand?: Visitor<contexts.WhereCommandVisitorContext<Visitors, Data>, any, any>;
  visitDropCommand?: Visitor<contexts.DropCommandVisitorContext<Visitors, Data>, any, any>;
  visitRenameCommand?: Visitor<contexts.RenameCommandVisitorContext<Visitors, Data>, any, any>;
  visitDissectCommand?: Visitor<contexts.DissectCommandVisitorContext<Visitors, Data>, any, any>;
  visitGrokCommand?: Visitor<contexts.GrokCommandVisitorContext<Visitors, Data>, any, any>;
  visitEnrichCommand?: Visitor<contexts.EnrichCommandVisitorContext<Visitors, Data>, any, any>;
  visitMvExpandCommand?: Visitor<contexts.MvExpandCommandVisitorContext<Visitors, Data>, any, any>;
  visitCommandOption?: Visitor<contexts.CommandOptionVisitorContext<Visitors, Data>, any, any>;
  visitExpression?: Visitor<contexts.ExpressionVisitorContext<Visitors, Data>, any, any>;
  visitSourceExpression?: Visitor<
    contexts.SourceExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitColumnExpression?: Visitor<
    contexts.ColumnExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitFunctionCallExpression?: Visitor<
    contexts.FunctionCallExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitLiteralExpression?: Visitor<
    contexts.LiteralExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitListLiteralExpression?: Visitor<
    contexts.ListLiteralExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitTimeIntervalLiteralExpression?: Visitor<
    contexts.TimeIntervalLiteralExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitInlineCastExpression?: Visitor<
    contexts.InlineCastExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitRenameExpression?: Visitor<
    contexts.RenameExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
}

/**
 * Maps any AST node to the corresponding visitor context.
 */
export type AstNodeToVisitorName<Node extends VisitorAstNode> = Node extends ESQLAstQueryNode
  ? 'visitQuery'
  : Node extends ast.ESQLCommand
  ? 'visitCommand'
  : Node extends ast.ESQLCommandOption
  ? 'visitCommandOption'
  : Node extends ast.ESQLSource
  ? 'visitSourceExpression'
  : Node extends ast.ESQLColumn
  ? 'visitColumnExpression'
  : Node extends ast.ESQLFunction
  ? 'visitFunctionCallExpression'
  : Node extends ast.ESQLLiteral
  ? 'visitLiteralExpression'
  : Node extends ast.ESQLList
  ? 'visitListLiteralExpression'
  : Node extends ast.ESQLTimeInterval
  ? 'visitTimeIntervalLiteralExpression'
  : Node extends ast.ESQLInlineCast
  ? 'visitInlineCastExpression'
  : never;

/**
 * Asserts that a type is a function.
 */
export type EnsureFunction<T> = T extends (...args: any[]) => any ? T : never;

/**
 * Converts `undefined` to `void`. This allows to make optional a function
 * parameter or the return value.
 */
export type UndefinedToVoid<T> = T extends undefined ? void : T;

/** Returns `Y` if `T` is `any`, or `N` otherwise. */
export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

/** Converts `any` type to `void`. */
export type AnyToVoid<T> = IfAny<T, void, T>;
