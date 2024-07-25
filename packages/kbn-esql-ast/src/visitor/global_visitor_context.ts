/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ColumnExpressionVisitorContext,
  ExpressionVisitorContext,
  FunctionCallExpressionVisitorContext,
  LiteralExpressionVisitorContext,
  SourceExpressionVisitorContext,
  type VisitorContext,
} from './contexts';
import type { ESQLColumn, ESQLFunction, ESQLLiteral, ESQLSource } from '../types';
import type { ESQLAstExpressionNode, VisitorInput, VisitorMethods, VisitorOutput } from './types';

export type SharedData = Record<string, unknown>;

/**
 * Global shared visitor context available to all visitors when visiting the AST.
 * It contains the shared data, which can be accessed and modified by all visitors.
 */
export class GlobalVisitorContext<
  Methods extends VisitorMethods = VisitorMethods,
  Data extends SharedData = SharedData
> {
  constructor(
    /**
     * Visitor methods, used internally by the visitor to traverse the AST.
     * @protected
     */
    public readonly methods: Methods,

    /**
     * Shared data, which can be accessed and modified by all visitors.
     */
    public data: Data
  ) {}

  public assertMethodExists<K extends keyof VisitorMethods>(name: K) {
    if (!this.methods[name]) {
      throw new Error(`${name}() method is not defined`);
    }
  }

  // Expression visiting -------------------------------------------------------

  public visitExpression(
    parent: VisitorContext | null,
    node: ESQLAstExpressionNode,
    input: VisitorInput<Methods, 'visitExpression'>
  ): VisitorOutput<Methods, 'visitExpression'> {
    this.assertMethodExists('visitExpression');

    const context = new ExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitExpression!(context, input);

    return output;
  }

  public visitColumn(
    parent: VisitorContext | null,
    node: ESQLColumn,
    input: VisitorInput<Methods, 'visitColumn'>
  ): VisitorOutput<Methods, 'visitColumn'> {
    this.assertMethodExists('visitColumn');

    const context = new ColumnExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitColumn!(context, input);

    return output;
  }

  public visitSource(
    parent: VisitorContext | null,
    node: ESQLSource,
    input: VisitorInput<Methods, 'visitSource'>
  ): VisitorOutput<Methods, 'visitSource'> {
    this.assertMethodExists('visitSource');

    const context = new SourceExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitSource!(context, input);

    return output;
  }

  public visitFunctionCallExpression(
    parent: VisitorContext | null,
    node: ESQLFunction,
    input: VisitorInput<Methods, 'visitFunctionCallExpression'>
  ): VisitorOutput<Methods, 'visitFunctionCallExpression'> {
    this.assertMethodExists('visitFunctionCallExpression');

    const context = new FunctionCallExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitFunctionCallExpression!(context, input);

    return output;
  }

  public visitLiteralExpression(
    parent: VisitorContext | null,
    node: ESQLLiteral,
    input: VisitorInput<Methods, 'visitLiteralExpression'>
  ): VisitorOutput<Methods, 'visitLiteralExpression'> {
    this.assertMethodExists('visitLiteralExpression');

    const context = new LiteralExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitLiteralExpression!(context, input);

    return output;
  }
}
