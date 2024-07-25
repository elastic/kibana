/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ESQLAst,
  ESQLAstNode,
  ESQLColumn,
  ESQLCommand,
  ESQLCommandOption,
  ESQLSource,
  ESQLAstItem,
  ESQLFunction,
  ESQLLiteral,
} from '../types';
import type { SharedData } from './global_visitor_context';
import type {
  VisitorContext,
  QueryVisitorContext,
  CommandVisitorContext,
  FromCommandVisitorContext,
  LimitCommandVisitorContext,
  SourceExpressionVisitorContext,
  ColumnExpressionVisitorContext,
  CommandOptionVisitorContext,
  ExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  LiteralExpressionVisitorContext,
} from './contexts';

/**
 * We don't have a dedicated "query" AST node, so - for now - we use the root
 * array of commands as the "query" node.
 */
export type ESQLAstQueryNode = ESQLAst;

/**
 * Represents an "expression" node in the AST.
 */
export type ESQLAstExpressionNode = ESQLAstItem;

/**
 * All possible AST nodes supported by the visitor.
 */
export type VisitorAstNode = ESQLAstQueryNode | ESQLAstNode;

export type Visitor<Ctx extends VisitorContext, Input = unknown, Output = unknown> = (
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
      VisitorInput<Methods, 'visitColumn'> &
      VisitorInput<Methods, 'visitSource'> &
      VisitorInput<Methods, 'visitFunctionCallExpression'> &
      VisitorInput<Methods, 'visitLiteralExpression'>
>;

/**
 * Input that satisfies any expression visitor output constraints.
 */
export type ExpressionVisitorOutput<Methods extends VisitorMethods> =
  | VisitorOutput<Methods, 'visitExpression'>
  | VisitorOutput<Methods, 'visitColumn'>
  | VisitorOutput<Methods, 'visitSource'>
  | VisitorOutput<Methods, 'visitFunctionCallExpression'>
  | VisitorOutput<Methods, 'visitLiteralExpression'>;

export interface VisitorMethods<
  Visitors extends VisitorMethods = any,
  Data extends SharedData = SharedData
> {
  visitQuery?: Visitor<QueryVisitorContext<Visitors, Data>, any, any>;
  visitCommand?: Visitor<CommandVisitorContext<Visitors, Data>, any, any>;
  visitFromCommand?: Visitor<FromCommandVisitorContext<Visitors, Data>, any, any>;
  visitLimitCommand?: Visitor<LimitCommandVisitorContext<Visitors, Data>, any, any>;
  visitCommandOption?: Visitor<CommandOptionVisitorContext<Visitors, Data>, any, any>;
  visitExpression?: Visitor<ExpressionVisitorContext<Visitors, Data>, any, any>;
  visitSource?: Visitor<SourceExpressionVisitorContext<Visitors, Data>, any, any>;
  visitColumn?: Visitor<ColumnExpressionVisitorContext<Visitors, Data>, any, any>;
  visitFunctionCallExpression?: Visitor<
    FunctionCallExpressionVisitorContext<Visitors, Data>,
    any,
    any
  >;
  visitLiteralExpression?: Visitor<LiteralExpressionVisitorContext<Visitors, Data>, any, any>;
}

/**
 * Maps any AST node to the corresponding visitor context.
 */
export type AstNodeToVisitorName<Node extends VisitorAstNode> = Node extends ESQLAstQueryNode
  ? 'visitQuery'
  : Node extends ESQLCommand
  ? 'visitCommand'
  : Node extends ESQLCommandOption
  ? 'visitCommandOption'
  : Node extends ESQLSource
  ? 'visitSource'
  : Node extends ESQLColumn
  ? 'visitColumn'
  : Node extends ESQLFunction
  ? 'visitFunctionCallExpression'
  : Node extends ESQLLiteral
  ? 'visitLiteralExpression'
  : never;

/**
 * Maps any AST node to the corresponding visitor context.
 */
export type AstNodeToVisitor<
  Node extends VisitorAstNode,
  Methods extends VisitorMethods = VisitorMethods
> = Methods[AstNodeToVisitorName<Node>];

/**
 * Maps any AST node to its corresponding visitor context.
 */
export type AstNodeToContext<
  Node extends VisitorAstNode,
  Methods extends VisitorMethods = VisitorMethods
> = Parameters<EnsureFunction<AstNodeToVisitor<Node, Methods>>>[0];

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
