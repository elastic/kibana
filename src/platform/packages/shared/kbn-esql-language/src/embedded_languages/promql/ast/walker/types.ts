/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLProperNode } from '../../../../types';
import type * as promql from '../../types';
import type { PromqlWalker } from './walker';

export type PromqlWalkerVisitorApi = Pick<PromqlWalker, 'abort'>;
export type PromqlWalkerAstNode = promql.PromQLAstNode;
export type PromqlWalkerAstParent = ESQLProperNode | promql.PromQLAstNode | undefined;

export interface PromqlWalkerOptions {
  // ---------------------------------------------------------- PromQL visitors

  /**
   * Called when visiting a PromQL query expression node.
   */
  visitPromqlQuery?: (
    node: promql.PromQLAstQueryExpression,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL function node.
   */
  visitPromqlFunction?: (
    node: promql.PromQLFunction,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL selector node (instant or range vector).
   */
  visitPromqlSelector?: (
    node: promql.PromQLSelector,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL binary expression node.
   */
  visitPromqlBinaryExpression?: (
    node: promql.PromQLBinaryExpression,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL unary expression node.
   */
  visitPromqlUnaryExpression?: (
    node: promql.PromQLUnaryExpression,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL subquery node.
   */
  visitPromqlSubquery?: (
    node: promql.PromQLSubquery,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL parenthesized expression node.
   */
  visitPromqlParens?: (
    node: promql.PromQLParens,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL literal node (numeric, string, or time).
   */
  visitPromqlLiteral?: (
    node: promql.PromQLLiteral,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL identifier node.
   */
  visitPromqlIdentifier?: (
    node: promql.PromQLIdentifier,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL label map node.
   */
  visitPromqlLabelMap?: (
    node: promql.PromQLLabelMap,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL label node.
   */
  visitPromqlLabel?: (
    node: promql.PromQLLabel,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL grouping node (BY or WITHOUT).
   */
  visitPromqlGrouping?: (
    node: promql.PromQLGrouping,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL evaluation modifier node (offset and @).
   */
  visitPromqlEvaluation?: (
    node: promql.PromQLEvaluation,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL offset modifier node.
   */
  visitPromqlOffset?: (
    node: promql.PromQLOffset,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL @ timestamp modifier node.
   */
  visitPromqlAt?: (
    node: promql.PromQLAt,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL vector matching modifier node (on/ignoring).
   */
  visitPromqlModifier?: (
    node: promql.PromQLModifier,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL group modifier node (group_left/group_right).
   */
  visitPromqlGroupModifier?: (
    node: promql.PromQLGroupModifier,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Called when visiting a PromQL unknown item node.
   */
  visitPromqlUnknown?: (
    node: promql.PromQLUnknownItem,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  // ------------------------------------------------------------ Other options

  /**
   * Called for any PromQL AST node type that does not have a specific visitor.
   */
  visitPromqlAny?: (
    node: promql.PromQLAstNode,
    parent: PromqlWalkerAstParent,
    walker: PromqlWalkerVisitorApi
  ) => void;

  /**
   * Order in which to traverse child nodes. If set to 'forward', child nodes
   * are traversed in the order they appear in the AST. If set to 'backward',
   * child nodes are traversed in reverse order.
   *
   * @default 'forward'
   */
  order?: 'forward' | 'backward';
}
