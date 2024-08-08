/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ErrorNode, ParserRuleContext, TerminalNode } from 'antlr4';
import {
  type ShowInfoContext,
  type MetaFunctionsContext,
  type SingleStatementContext,
  type RowCommandContext,
  type FromCommandContext,
  type EvalCommandContext,
  type StatsCommandContext,
  type LimitCommandContext,
  type SortCommandContext,
  type KeepCommandContext,
  type DropCommandContext,
  type RenameCommandContext,
  type DissectCommandContext,
  type GrokCommandContext,
  type MvExpandCommandContext,
  type ShowCommandContext,
  type EnrichCommandContext,
  type WhereCommandContext,
  default as esql_parser,
  type MetaCommandContext,
  type MetricsCommandContext,
  IndexPatternContext,
  InlinestatsCommandContext,
} from './antlr/esql_parser';
import { default as ESQLParserListener } from './antlr/esql_parser_listener';
import {
  createCommand,
  createFunction,
  createOption,
  createLiteral,
  textExistsAndIsValid,
  createSource,
  createAstBaseItem,
} from './ast_helpers';
import { getPosition } from './ast_position_utils';
import {
  collectAllSourceIdentifiers,
  collectAllFields,
  visitByOption,
  collectAllColumnIdentifiers,
  visitRenameClauses,
  visitDissect,
  visitGrok,
  collectBooleanExpression,
  visitOrderExpression,
  getPolicyName,
  getMatchField,
  getEnrichClauses,
} from './ast_walker';
import type { ESQLAst, ESQLAstMetricsCommand } from './types';

export class AstListener implements ESQLParserListener {
  private ast: ESQLAst = [];

  public getAst() {
    return { ast: this.ast };
  }

  /**
   * Exit a parse tree produced by the `showInfo`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitShowInfo(ctx: ShowInfoContext) {
    const commandAst = createCommand('show', ctx);

    this.ast.push(commandAst);
    commandAst.text = ctx.getText();
    if (textExistsAndIsValid(ctx.INFO().getText())) {
      // TODO: these probably should not be functions, instead use "column", like: INFO <identifier>?
      commandAst?.args.push(createFunction('info', ctx, getPosition(ctx.INFO().symbol)));
    }
  }

  /**
   * Exit a parse tree produced by the `showFunctions`
   * labeled alternative in `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  exitMetaFunctions(ctx: MetaFunctionsContext) {
    const commandAst = createCommand('meta', ctx);
    this.ast.push(commandAst);
    // update the text
    commandAst.text = ctx.getText();
    if (textExistsAndIsValid(ctx.FUNCTIONS().getText())) {
      commandAst?.args.push(createFunction('functions', ctx, getPosition(ctx.FUNCTIONS().symbol)));
    }
  }

  /**
   * Enter a parse tree produced by `esql_parser.singleStatement`.
   * @param ctx the parse tree
   */
  enterSingleStatement(ctx: SingleStatementContext) {
    this.ast = [];
  }

  /**
   * Exit a parse tree produced by `esql_parser.whereCommand`.
   * @param ctx the parse tree
   */
  exitWhereCommand(ctx: WhereCommandContext) {
    const command = createCommand('where', ctx);
    this.ast.push(command);
    command.args.push(...collectBooleanExpression(ctx.booleanExpression()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  exitRowCommand(ctx: RowCommandContext) {
    const command = createCommand('row', ctx);
    this.ast.push(command);
    command.args.push(...collectAllFields(ctx.fields()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  exitFromCommand(ctx: FromCommandContext) {
    const commandAst = createCommand('from', ctx);
    this.ast.push(commandAst);
    commandAst.args.push(...collectAllSourceIdentifiers(ctx));
    const metadataContext = ctx.metadata();
    const metadataContent =
      metadataContext?.deprecated_metadata()?.metadataOption() || metadataContext?.metadataOption();
    if (metadataContent) {
      const option = createOption(
        metadataContent.METADATA().getText().toLowerCase(),
        metadataContent
      );
      commandAst.args.push(option);
      option.args.push(...collectAllColumnIdentifiers(metadataContent));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.metricsCommand`.
   * @param ctx the parse tree
   */
  exitMetricsCommand(ctx: MetricsCommandContext): void {
    const node: ESQLAstMetricsCommand = {
      ...createAstBaseItem('metrics', ctx),
      type: 'command',
      args: [],
      sources: ctx
        .getTypedRuleContexts(IndexPatternContext)
        .map((sourceCtx) => createSource(sourceCtx)),
    };
    this.ast.push(node);
    const aggregates = collectAllFields(ctx.fields(0));
    const grouping = collectAllFields(ctx.fields(1));
    if (aggregates && aggregates.length) {
      node.aggregates = aggregates;
    }
    if (grouping && grouping.length) {
      node.grouping = grouping;
    }
    node.args.push(...node.sources, ...aggregates, ...grouping);
  }

  /**
   * Exit a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  exitEvalCommand(ctx: EvalCommandContext) {
    const commandAst = createCommand('eval', ctx);
    this.ast.push(commandAst);
    commandAst.args.push(...collectAllFields(ctx.fields()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  exitStatsCommand(ctx: StatsCommandContext) {
    const command = createCommand('stats', ctx);
    this.ast.push(command);

    // STATS expression is optional
    if (ctx._stats) {
      command.args.push(...collectAllFields(ctx.fields(0)));
    }
    if (ctx._grouping) {
      command.args.push(...visitByOption(ctx, ctx._stats ? ctx.fields(1) : ctx.fields(0)));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.inlinestatsCommand`.
   * @param ctx the parse tree
   */
  exitInlinestatsCommand(ctx: InlinestatsCommandContext) {
    const command = createCommand('inlinestats', ctx);
    this.ast.push(command);

    // STATS expression is optional
    if (ctx._stats) {
      command.args.push(...collectAllFields(ctx.fields(0)));
    }
    if (ctx._grouping) {
      command.args.push(...visitByOption(ctx, ctx._stats ? ctx.fields(1) : ctx.fields(0)));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  exitLimitCommand(ctx: LimitCommandContext) {
    const command = createCommand('limit', ctx);
    this.ast.push(command);
    if (ctx.getToken(esql_parser.INTEGER_LITERAL, 0)) {
      const literal = createLiteral('integer', ctx.INTEGER_LITERAL());
      if (literal) {
        command.args.push(literal);
      }
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  exitSortCommand(ctx: SortCommandContext) {
    const command = createCommand('sort', ctx);
    this.ast.push(command);
    command.args.push(...visitOrderExpression(ctx.orderExpression_list()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  exitKeepCommand(ctx: KeepCommandContext) {
    const command = createCommand('keep', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  exitDropCommand(ctx: DropCommandContext) {
    const command = createCommand('drop', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  exitRenameCommand(ctx: RenameCommandContext) {
    const command = createCommand('rename', ctx);
    this.ast.push(command);
    command.args.push(...visitRenameClauses(ctx.renameClause_list()));
  }

  /**
   * Exit a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  exitDissectCommand(ctx: DissectCommandContext) {
    const command = createCommand('dissect', ctx);
    this.ast.push(command);
    command.args.push(...visitDissect(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  exitGrokCommand(ctx: GrokCommandContext) {
    const command = createCommand('grok', ctx);
    this.ast.push(command);
    command.args.push(...visitGrok(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  exitMvExpandCommand(ctx: MvExpandCommandContext) {
    const command = createCommand('mv_expand', ctx);
    this.ast.push(command);
    command.args.push(...collectAllColumnIdentifiers(ctx));
  }

  /**
   * Enter a parse tree produced by `esql_parser.showCommand`.
   * @param ctx the parse tree
   */
  enterShowCommand(ctx: ShowCommandContext) {
    const command = createCommand('show', ctx);
    this.ast.push(command);
  }

  /**
   * Enter a parse tree produced by `esql_parser.metaCommand`.
   * @param ctx the parse tree
   */
  enterMetaCommand(ctx: MetaCommandContext) {
    const command = createCommand('meta', ctx);
    this.ast.push(command);
  }
  /**
   * Exit a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  exitEnrichCommand(ctx: EnrichCommandContext) {
    const command = createCommand('enrich', ctx);
    this.ast.push(command);
    command.args.push(...getPolicyName(ctx), ...getMatchField(ctx), ...getEnrichClauses(ctx));
  }

  enterEveryRule(ctx: ParserRuleContext): void {
    // method not implemented, added to satisfy interface expectation
  }

  visitErrorNode(node: ErrorNode): void {
    // method not implemented, added to satisfy interface expectation
  }

  visitTerminal(node: TerminalNode): void {
    // method not implemented, added to satisfy interface expectation
  }

  exitEveryRule(ctx: ParserRuleContext): void {
    // method not implemented, added to satisfy interface expectation
  }
}
