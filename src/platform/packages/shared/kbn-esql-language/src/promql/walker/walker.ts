/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as promql from '../types';
import type { PromqlWalkerAstNode, PromqlWalkerAstParent, PromqlWalkerOptions } from './types';

/**
 * Iterates over all PromQL AST nodes and calls the appropriate visitor
 * functions.
 */
export class PromqlWalker {
  /**
   * Walks the AST and calls the appropriate visitor functions.
   */
  public static readonly walk = (
    tree: PromqlWalkerAstNode,
    options: PromqlWalkerOptions,
    parent?: PromqlWalkerAstParent
  ): PromqlWalker => {
    const walker = new PromqlWalker(options);
    walker.walk(tree, parent);
    return walker;
  };

  public aborted: boolean = false;

  constructor(protected readonly options: PromqlWalkerOptions) {}

  public abort(): void {
    this.aborted = true;
  }

  /**
   * Walks a list of nodes in the order specified by the options.
   */
  protected walkList<T extends promql.PromQLAstNode>(
    list: T[],
    parent: PromqlWalkerAstParent
  ): void {
    if (this.aborted) return;

    const { options } = this;
    const length = list.length;

    if (options.order === 'backward') {
      for (let i = length - 1; i >= 0; i--) {
        this.walk(list[i], parent);
      }
    } else {
      for (let i = 0; i < length; i++) {
        this.walk(list[i], parent);
      }
    }
  }

  /**
   * Walk a PromQL AST node and dispatch to the appropriate walk method.
   */
  public walk(node: promql.PromQLAstNode, parent: PromqlWalkerAstParent = undefined): void {
    if (this.aborted) return;
    if (!node) return;

    switch (node.type) {
      case 'query':
        this.walkPromqlQuery(node as promql.PromQLAstQueryExpression, parent);
        break;
      case 'function':
        this.walkPromqlFunction(node as promql.PromQLFunction, parent);
        break;
      case 'selector':
        this.walkPromqlSelector(node as promql.PromQLSelector, parent);
        break;
      case 'binary-expression':
        this.walkPromqlBinaryExpression(node as promql.PromQLBinaryExpression, parent);
        break;
      case 'unary-expression':
        this.walkPromqlUnaryExpression(node as promql.PromQLUnaryExpression, parent);
        break;
      case 'subquery':
        this.walkPromqlSubquery(node as promql.PromQLSubquery, parent);
        break;
      case 'parens':
        this.walkPromqlParens(node as promql.PromQLParens, parent);
        break;
      case 'literal':
        this.walkPromqlLiteral(node as promql.PromQLLiteral, parent);
        break;
      case 'identifier':
        this.walkPromqlIdentifier(node as promql.PromQLIdentifier, parent);
        break;
      case 'label-map':
        this.walkPromqlLabelMap(node as promql.PromQLLabelMap, parent);
        break;
      case 'label':
        this.walkPromqlLabel(node as promql.PromQLLabel, parent);
        break;
      case 'grouping':
        this.walkPromqlGrouping(node as promql.PromQLGrouping, parent);
        break;
      case 'evaluation':
        this.walkPromqlEvaluation(node as promql.PromQLEvaluation, parent);
        break;
      case 'offset':
        this.walkPromqlOffset(node as promql.PromQLOffset, parent);
        break;
      case 'at':
        this.walkPromqlAt(node as promql.PromQLAt, parent);
        break;
      case 'modifier':
        this.walkPromqlModifier(node as promql.PromQLModifier, parent);
        break;
      case 'group-modifier':
        this.walkPromqlGroupModifier(node as promql.PromQLGroupModifier, parent);
        break;
      case 'unknown':
        this.walkPromqlUnknown(node as promql.PromQLUnknownItem, parent);
        break;
    }
  }

  public walkPromqlQuery(
    node: promql.PromQLAstQueryExpression,
    parent: PromqlWalkerAstParent
  ): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlQuery ?? options.visitPromqlAny)?.(node, parent, this);

    if (node.expression) {
      this.walk(node.expression, node);
    }
  }

  public walkPromqlFunction(node: promql.PromQLFunction, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlFunction ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      this.walkList(node.args, node);
      if (node.grouping) {
        this.walk(node.grouping, node);
      }
    } else {
      if (node.grouping) {
        this.walk(node.grouping, node);
      }
      this.walkList(node.args, node);
    }
  }

  public walkPromqlSelector(node: promql.PromQLSelector, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlSelector ?? options.visitPromqlAny)?.(node, parent, this);

    // Walk children from the args array which contains all child nodes in order
    this.walkList(node.args, node);
  }

  public walkPromqlBinaryExpression(
    node: promql.PromQLBinaryExpression,
    parent: PromqlWalkerAstParent
  ): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlBinaryExpression ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      this.walk(node.right, node);
      if (node.modifier) {
        this.walk(node.modifier, node);
      }
      this.walk(node.left, node);
    } else {
      this.walk(node.left, node);
      if (node.modifier) {
        this.walk(node.modifier, node);
      }
      this.walk(node.right, node);
    }
  }

  public walkPromqlUnaryExpression(
    node: promql.PromQLUnaryExpression,
    parent: PromqlWalkerAstParent
  ): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlUnaryExpression ?? options.visitPromqlAny)?.(node, parent, this);

    this.walk(node.arg, node);
  }

  public walkPromqlSubquery(node: promql.PromQLSubquery, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlSubquery ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      if (node.evaluation) {
        this.walk(node.evaluation, node);
      }
      if (node.resolution) {
        this.walk(node.resolution, node);
      }
      this.walk(node.range, node);
      this.walk(node.expr, node);
    } else {
      this.walk(node.expr, node);
      this.walk(node.range, node);
      if (node.resolution) {
        this.walk(node.resolution, node);
      }
      if (node.evaluation) {
        this.walk(node.evaluation, node);
      }
    }
  }

  public walkPromqlParens(node: promql.PromQLParens, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlParens ?? options.visitPromqlAny)?.(node, parent, this);

    if (node.child) {
      this.walk(node.child, node);
    }
  }

  public walkPromqlLiteral(node: promql.PromQLLiteral, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlLiteral ?? options.visitPromqlAny)?.(node, parent, this);
  }

  public walkPromqlIdentifier(node: promql.PromQLIdentifier, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlIdentifier ?? options.visitPromqlAny)?.(node, parent, this);
  }

  public walkPromqlLabelMap(node: promql.PromQLLabelMap, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlLabelMap ?? options.visitPromqlAny)?.(node, parent, this);

    this.walkList(node.args, node);
  }

  public walkPromqlLabel(node: promql.PromQLLabel, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlLabel ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      if (node.value) {
        this.walk(node.value, node);
      }
      this.walk(node.labelName, node);
    } else {
      this.walk(node.labelName, node);
      if (node.value) {
        this.walk(node.value, node);
      }
    }
  }

  public walkPromqlGrouping(node: promql.PromQLGrouping, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlGrouping ?? options.visitPromqlAny)?.(node, parent, this);

    this.walkList(node.args, node);
  }

  public walkPromqlEvaluation(node: promql.PromQLEvaluation, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlEvaluation ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      if (node.at) {
        this.walk(node.at, node);
      }
      if (node.offset) {
        this.walk(node.offset, node);
      }
    } else {
      if (node.offset) {
        this.walk(node.offset, node);
      }
      if (node.at) {
        this.walk(node.at, node);
      }
    }
  }

  public walkPromqlOffset(node: promql.PromQLOffset, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlOffset ?? options.visitPromqlAny)?.(node, parent, this);

    this.walk(node.duration, node);
  }

  public walkPromqlAt(node: promql.PromQLAt, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlAt ?? options.visitPromqlAny)?.(node, parent, this);

    // Only walk if value is a PromQL node (not a string modifier like 'start()' or 'end()')
    if (typeof node.value !== 'string') {
      this.walk(node.value, node);
    }
  }

  public walkPromqlModifier(node: promql.PromQLModifier, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlModifier ?? options.visitPromqlAny)?.(node, parent, this);

    if (options.order === 'backward') {
      if (node.groupModifier) {
        this.walk(node.groupModifier, node);
      }
      this.walkList(node.labels, node);
    } else {
      this.walkList(node.labels, node);
      if (node.groupModifier) {
        this.walk(node.groupModifier, node);
      }
    }
  }

  public walkPromqlGroupModifier(
    node: promql.PromQLGroupModifier,
    parent: PromqlWalkerAstParent
  ): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlGroupModifier ?? options.visitPromqlAny)?.(node, parent, this);

    this.walkList(node.labels, node);
  }

  public walkPromqlUnknown(node: promql.PromQLUnknownItem, parent: PromqlWalkerAstParent): void {
    if (this.aborted) return;
    const { options } = this;
    (options.visitPromqlUnknown ?? options.visitPromqlAny)?.(node, parent, this);
  }
}
