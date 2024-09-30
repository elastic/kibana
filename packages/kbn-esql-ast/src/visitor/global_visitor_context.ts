/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as contexts from './contexts';
import type {
  ESQLAstCommand,
  ESQLAstRenameExpression,
  ESQLColumn,
  ESQLFunction,
  ESQLInlineCast,
  ESQLList,
  ESQLLiteral,
  ESQLOrderExpression,
  ESQLSource,
  ESQLTimeInterval,
} from '../types';
import type * as types from './types';

export type SharedData = Record<string, unknown>;

/**
 * Global shared visitor context available to all visitors when visiting the AST.
 * It contains the shared data, which can be accessed and modified by all visitors.
 */
export class GlobalVisitorContext<
  Methods extends types.VisitorMethods = types.VisitorMethods,
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

  public assertMethodExists<K extends keyof types.VisitorMethods>(name: K) {
    if (!this.methods[name]) {
      throw new Error(`${name}() method is not defined`);
    }
  }

  private visitWithSpecificContext<
    Method extends keyof types.VisitorMethods,
    Context extends contexts.VisitorContext
  >(
    method: Method,
    context: Context,
    input: types.VisitorInput<Methods, Method>
  ): types.VisitorOutput<Methods, Method> {
    this.assertMethodExists(method);
    return this.methods[method]!(context as any, input);
  }

  // Command visiting ----------------------------------------------------------

  public visitCommandGeneric(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitCommand'>
  ): types.VisitorOutput<Methods, 'visitCommand'> {
    this.assertMethodExists('visitCommand');

    const context = new contexts.CommandVisitorContext(this, node, parent);
    const output = this.methods.visitCommand!(context, input);

    return output;
  }

  public visitCommand(
    parent: contexts.VisitorContext | null,
    commandNode: ESQLAstCommand,
    input: types.CommandVisitorInput<Methods>
  ): types.CommandVisitorOutput<Methods> {
    switch (commandNode.name) {
      case 'from': {
        if (!this.methods.visitFromCommand) break;
        return this.visitFromCommand(parent, commandNode, input as any);
      }
      case 'limit': {
        if (!this.methods.visitLimitCommand) break;
        return this.visitLimitCommand(parent, commandNode, input as any);
      }
      case 'explain': {
        if (!this.methods.visitExplainCommand) break;
        return this.visitExplainCommand(parent, commandNode, input as any);
      }
      case 'row': {
        if (!this.methods.visitRowCommand) break;
        return this.visitRowCommand(parent, commandNode, input as any);
      }
      // TODO: uncomment this when the command is implemented
      // case 'metrics': {
      //   if (!this.methods.visitMetricsCommand) break;
      //   return this.visitMetricsCommand(parent, commandNode, input as any);
      // }
      case 'show': {
        if (!this.methods.visitShowCommand) break;
        return this.visitShowCommand(parent, commandNode, input as any);
      }
      case 'meta': {
        if (!this.methods.visitMetaCommand) break;
        return this.visitMetaCommand(parent, commandNode, input as any);
      }
      case 'eval': {
        if (!this.methods.visitEvalCommand) break;
        return this.visitEvalCommand(parent, commandNode, input as any);
      }
      case 'stats': {
        if (!this.methods.visitStatsCommand) break;
        return this.visitStatsCommand(parent, commandNode, input as any);
      }
      case 'inline_stats': {
        if (!this.methods.visitInlineStatsCommand) break;
        return this.visitInlineStatsCommand(parent, commandNode, input as any);
      }
      case 'lookup': {
        if (!this.methods.visitLookupCommand) break;
        return this.visitLookupCommand(parent, commandNode, input as any);
      }
      case 'keep': {
        if (!this.methods.visitKeepCommand) break;
        return this.visitKeepCommand(parent, commandNode, input as any);
      }
      case 'sort': {
        if (!this.methods.visitSortCommand) break;
        return this.visitSortCommand(parent, commandNode, input as any);
      }
      case 'where': {
        if (!this.methods.visitWhereCommand) break;
        return this.visitWhereCommand(parent, commandNode, input as any);
      }
      case 'drop': {
        if (!this.methods.visitDropCommand) break;
        return this.visitDropCommand(parent, commandNode, input as any);
      }
      case 'rename': {
        if (!this.methods.visitRenameCommand) break;
        return this.visitRenameCommand(parent, commandNode, input as any);
      }
      case 'dissect': {
        if (!this.methods.visitDissectCommand) break;
        return this.visitDissectCommand(parent, commandNode, input as any);
      }
      case 'grok': {
        if (!this.methods.visitGrokCommand) break;
        return this.visitGrokCommand(parent, commandNode, input as any);
      }
      case 'enrich': {
        if (!this.methods.visitEnrichCommand) break;
        return this.visitEnrichCommand(parent, commandNode, input as any);
      }
      case 'mv_expand': {
        if (!this.methods.visitMvExpandCommand) break;
        return this.visitMvExpandCommand(parent, commandNode, input as any);
      }
    }
    return this.visitCommandGeneric(parent, commandNode, input as any);
  }

  public visitFromCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitFromCommand'>
  ): types.VisitorOutput<Methods, 'visitFromCommand'> {
    const context = new contexts.FromCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitFromCommand', context, input);
  }

  public visitLimitCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitLimitCommand'>
  ): types.VisitorOutput<Methods, 'visitLimitCommand'> {
    const context = new contexts.LimitCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitLimitCommand', context, input);
  }

  public visitExplainCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitExplainCommand'>
  ): types.VisitorOutput<Methods, 'visitExplainCommand'> {
    const context = new contexts.ExplainCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitExplainCommand', context, input);
  }

  public visitRowCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitRowCommand'>
  ): types.VisitorOutput<Methods, 'visitRowCommand'> {
    const context = new contexts.RowCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitRowCommand', context, input);
  }

  public visitMetricsCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitMetricsCommand'>
  ): types.VisitorOutput<Methods, 'visitMetricsCommand'> {
    const context = new contexts.MetricsCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitMetricsCommand', context, input);
  }

  public visitShowCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitShowCommand'>
  ): types.VisitorOutput<Methods, 'visitShowCommand'> {
    const context = new contexts.ShowCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitShowCommand', context, input);
  }

  public visitMetaCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitMetaCommand'>
  ): types.VisitorOutput<Methods, 'visitMetaCommand'> {
    const context = new contexts.MetaCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitMetaCommand', context, input);
  }

  public visitEvalCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitEvalCommand'>
  ): types.VisitorOutput<Methods, 'visitEvalCommand'> {
    const context = new contexts.EvalCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitEvalCommand', context, input);
  }

  public visitStatsCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitStatsCommand'>
  ): types.VisitorOutput<Methods, 'visitStatsCommand'> {
    const context = new contexts.StatsCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitStatsCommand', context, input);
  }

  public visitInlineStatsCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitInlineStatsCommand'>
  ): types.VisitorOutput<Methods, 'visitInlineStatsCommand'> {
    const context = new contexts.InlineStatsCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitInlineStatsCommand', context, input);
  }

  public visitLookupCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitLookupCommand'>
  ): types.VisitorOutput<Methods, 'visitLookupCommand'> {
    const context = new contexts.LookupCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitLookupCommand', context, input);
  }

  public visitKeepCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitKeepCommand'>
  ): types.VisitorOutput<Methods, 'visitKeepCommand'> {
    const context = new contexts.KeepCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitKeepCommand', context, input);
  }

  public visitSortCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitSortCommand'>
  ): types.VisitorOutput<Methods, 'visitSortCommand'> {
    const context = new contexts.SortCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitSortCommand', context, input);
  }

  public visitWhereCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitWhereCommand'>
  ): types.VisitorOutput<Methods, 'visitWhereCommand'> {
    const context = new contexts.WhereCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitWhereCommand', context, input);
  }

  public visitDropCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitDropCommand'>
  ): types.VisitorOutput<Methods, 'visitDropCommand'> {
    const context = new contexts.DropCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitDropCommand', context, input);
  }

  public visitRenameCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitRenameCommand'>
  ): types.VisitorOutput<Methods, 'visitRenameCommand'> {
    const context = new contexts.RenameCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitRenameCommand', context, input);
  }

  public visitDissectCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitDissectCommand'>
  ): types.VisitorOutput<Methods, 'visitDissectCommand'> {
    const context = new contexts.DissectCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitDissectCommand', context, input);
  }

  public visitGrokCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitGrokCommand'>
  ): types.VisitorOutput<Methods, 'visitGrokCommand'> {
    const context = new contexts.GrokCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitGrokCommand', context, input);
  }

  public visitEnrichCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitEnrichCommand'>
  ): types.VisitorOutput<Methods, 'visitEnrichCommand'> {
    const context = new contexts.EnrichCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitEnrichCommand', context, input);
  }

  public visitMvExpandCommand(
    parent: contexts.VisitorContext | null,
    node: ESQLAstCommand,
    input: types.VisitorInput<Methods, 'visitMvExpandCommand'>
  ): types.VisitorOutput<Methods, 'visitMvExpandCommand'> {
    const context = new contexts.MvExpandCommandVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitMvExpandCommand', context, input);
  }

  // Expression visiting -------------------------------------------------------

  public visitExpressionGeneric(
    parent: contexts.VisitorContext | null,
    node: types.ESQLAstExpressionNode,
    input: types.VisitorInput<Methods, 'visitExpression'>
  ): types.VisitorOutput<Methods, 'visitExpression'> {
    this.assertMethodExists('visitExpression');

    const context = new contexts.ExpressionVisitorContext(this, node, parent);
    const output = this.methods.visitExpression!(context, input);

    return output;
  }

  public visitExpression(
    parent: contexts.VisitorContext | null,
    expressionNode: types.ESQLAstExpressionNode,
    input: types.ExpressionVisitorInput<Methods>
  ): types.ExpressionVisitorOutput<Methods> {
    if (Array.isArray(expressionNode)) {
      throw new Error('should not happen');
    }
    switch (expressionNode.type) {
      case 'column': {
        if (!this.methods.visitColumnExpression) break;
        return this.visitColumnExpression(parent, expressionNode, input as any);
      }
      case 'source': {
        if (!this.methods.visitSourceExpression) break;
        return this.visitSourceExpression(parent, expressionNode, input as any);
      }
      case 'function': {
        if (!this.methods.visitFunctionCallExpression) break;
        return this.visitFunctionCallExpression(parent, expressionNode, input as any);
      }
      case 'literal': {
        if (!this.methods.visitLiteralExpression) break;
        return this.visitLiteralExpression(parent, expressionNode, input as any);
      }
      case 'list': {
        if (!this.methods.visitListLiteralExpression) break;
        return this.visitListLiteralExpression(parent, expressionNode, input as any);
      }
      case 'timeInterval': {
        if (!this.methods.visitTimeIntervalLiteralExpression) break;
        return this.visitTimeIntervalLiteralExpression(parent, expressionNode, input as any);
      }
      case 'inlineCast': {
        if (!this.methods.visitInlineCastExpression) break;
        return this.visitInlineCastExpression(parent, expressionNode, input as any);
      }
      case 'order': {
        if (!this.methods.visitOrderExpression) break;
        return this.visitOrderExpression(parent, expressionNode, input as any);
      }
      case 'option': {
        switch (expressionNode.name) {
          case 'as': {
            if (!this.methods.visitRenameExpression) break;
            return this.visitRenameExpression(
              parent,
              expressionNode as ESQLAstRenameExpression,
              input as any
            );
          }
        }
      }
    }
    return this.visitExpressionGeneric(parent, expressionNode, input as any);
  }

  public visitColumnExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLColumn,
    input: types.VisitorInput<Methods, 'visitColumnExpression'>
  ): types.VisitorOutput<Methods, 'visitColumnExpression'> {
    const context = new contexts.ColumnExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitColumnExpression', context, input);
  }

  public visitSourceExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLSource,
    input: types.VisitorInput<Methods, 'visitSourceExpression'>
  ): types.VisitorOutput<Methods, 'visitSourceExpression'> {
    const context = new contexts.SourceExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitSourceExpression', context, input);
  }

  public visitFunctionCallExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLFunction,
    input: types.VisitorInput<Methods, 'visitFunctionCallExpression'>
  ): types.VisitorOutput<Methods, 'visitFunctionCallExpression'> {
    const context = new contexts.FunctionCallExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitFunctionCallExpression', context, input);
  }

  public visitLiteralExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLLiteral,
    input: types.VisitorInput<Methods, 'visitLiteralExpression'>
  ): types.VisitorOutput<Methods, 'visitLiteralExpression'> {
    const context = new contexts.LiteralExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitLiteralExpression', context, input);
  }

  public visitListLiteralExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLList,
    input: types.VisitorInput<Methods, 'visitListLiteralExpression'>
  ): types.VisitorOutput<Methods, 'visitListLiteralExpression'> {
    const context = new contexts.ListLiteralExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitListLiteralExpression', context, input);
  }

  public visitTimeIntervalLiteralExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLTimeInterval,
    input: types.VisitorInput<Methods, 'visitTimeIntervalLiteralExpression'>
  ): types.VisitorOutput<Methods, 'visitTimeIntervalLiteralExpression'> {
    const context = new contexts.TimeIntervalLiteralExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitTimeIntervalLiteralExpression', context, input);
  }

  public visitInlineCastExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLInlineCast,
    input: types.VisitorInput<Methods, 'visitInlineCastExpression'>
  ): types.VisitorOutput<Methods, 'visitInlineCastExpression'> {
    const context = new contexts.InlineCastExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitInlineCastExpression', context, input);
  }

  public visitRenameExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLAstRenameExpression,
    input: types.VisitorInput<Methods, 'visitRenameExpression'>
  ): types.VisitorOutput<Methods, 'visitRenameExpression'> {
    const context = new contexts.RenameExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitRenameExpression', context, input);
  }

  public visitOrderExpression(
    parent: contexts.VisitorContext | null,
    node: ESQLOrderExpression,
    input: types.VisitorInput<Methods, 'visitOrderExpression'>
  ): types.VisitorOutput<Methods, 'visitOrderExpression'> {
    const context = new contexts.OrderExpressionVisitorContext(this, node, parent);
    return this.visitWithSpecificContext('visitOrderExpression', context, input);
  }
}
