/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ErrorNode, ParserRuleContext, TerminalNode } from 'antlr4';
import { createCompletionCommand } from './factories/completion';
import {
  InlinestatsCommandContext,
  JoinCommandContext,
  type ChangePointCommandContext,
  type DissectCommandContext,
  type DropCommandContext,
  type EnrichCommandContext,
  type EvalCommandContext,
  type ForkCommandContext,
  type FromCommandContext,
  type GrokCommandContext,
  type KeepCommandContext,
  type LimitCommandContext,
  type MvExpandCommandContext,
  type RenameCommandContext,
  type RowCommandContext,
  type ShowCommandContext,
  type ShowInfoContext,
  type SingleStatementContext,
  type SortCommandContext,
  type StatsCommandContext,
  type TimeSeriesCommandContext,
  type WhereCommandContext,
  RerankCommandContext,
  CompletionCommandContext,
  RrfCommandContext,
  SampleCommandContext,
} from '../antlr/esql_parser';
import { default as ESQLParserListener } from '../antlr/esql_parser_listener';
import type { ESQLAst } from '../types';
import { createCommand, createFunction, textExistsAndIsValid } from './factories';
import { createChangePointCommand } from './factories/change_point';
import { createDissectCommand } from './factories/dissect';
import { createEvalCommand } from './factories/eval';
import { createForkCommand } from './factories/fork';
import { createFromCommand } from './factories/from';
import { createGrokCommand } from './factories/grok';
import { createJoinCommand } from './factories/join';
import { createLimitCommand } from './factories/limit';
import { createRowCommand } from './factories/row';
import { createSortCommand } from './factories/sort';
import { createStatsCommand } from './factories/stats';
import { createWhereCommand } from './factories/where';
import { createMvExpandCommand } from './factories/mv_expand';
import { createKeepCommand } from './factories/keep';
import { createDropCommand } from './factories/drop';
import { createRenameCommand } from './factories/rename';
import { createSampleCommand } from './factories/sample';
import { getPosition } from './helpers';
import { collectAllAggFields, visitByOption } from './walkers';
import { createTimeseriesCommand } from './factories/timeseries';
import { createRerankCommand } from './factories/rerank';
import { createEnrichCommand } from './factories/enrich';

export class ESQLAstBuilderListener implements ESQLParserListener {
  private ast: ESQLAst = [];
  private inFork: boolean = false;

  constructor(public src: string) {}

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
    if (this.inFork) {
      return;
    }

    const command = createWhereCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.rowCommand`.
   * @param ctx the parse tree
   */
  exitRowCommand(ctx: RowCommandContext) {
    const command = createRowCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.fromCommand`.
   * @param ctx the parse tree
   */
  exitFromCommand(ctx: FromCommandContext) {
    const command = createFromCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.timeseriesCommand`.
   * @param ctx the parse tree
   */
  exitTimeSeriesCommand(ctx: TimeSeriesCommandContext): void {
    const command = createTimeseriesCommand(ctx);
    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.evalCommand`.
   * @param ctx the parse tree
   */
  exitEvalCommand(ctx: EvalCommandContext) {
    if (this.inFork) {
      return;
    }
    this.ast.push(createEvalCommand(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.statsCommand`.
   * @param ctx the parse tree
   */
  exitStatsCommand(ctx: StatsCommandContext) {
    if (this.inFork) {
      return;
    }

    const command = createStatsCommand(ctx);

    this.ast.push(command);
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
      command.args.push(...collectAllAggFields(ctx.aggFields()));
    }
    if (ctx._grouping) {
      command.args.push(...visitByOption(ctx, ctx.fields()));
    }
  }

  /**
   * Exit a parse tree produced by `esql_parser.limitCommand`.
   * @param ctx the parse tree
   */
  exitLimitCommand(ctx: LimitCommandContext) {
    if (this.inFork) {
      return;
    }

    const command = createLimitCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.sortCommand`.
   * @param ctx the parse tree
   */
  exitSortCommand(ctx: SortCommandContext) {
    if (this.inFork) {
      return;
    }

    const command = createSortCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.keepCommand`.
   * @param ctx the parse tree
   */
  exitKeepCommand(ctx: KeepCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createKeepCommand(ctx);
    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.dropCommand`.
   * @param ctx the parse tree
   */
  exitDropCommand(ctx: DropCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createDropCommand(ctx);
    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.renameCommand`.
   * @param ctx the parse tree
   */
  exitRenameCommand(ctx: RenameCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createRenameCommand(ctx);
    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.dissectCommand`.
   * @param ctx the parse tree
   */
  exitDissectCommand(ctx: DissectCommandContext) {
    if (this.inFork) {
      return;
    }
    this.ast.push(createDissectCommand(ctx));
  }

  /**
   * Exit a parse tree produced by `esql_parser.grokCommand`.
   * @param ctx the parse tree
   */
  exitGrokCommand(ctx: GrokCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createGrokCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.mvExpandCommand`.
   * @param ctx the parse tree
   */
  exitMvExpandCommand(ctx: MvExpandCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createMvExpandCommand(ctx);
    this.ast.push(command);
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
   * Exit a parse tree produced by `esql_parser.enrichCommand`.
   * @param ctx the parse tree
   */
  exitEnrichCommand(ctx: EnrichCommandContext) {
    if (this.inFork) {
      return;
    }
    const command = createEnrichCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.joinCommand`.
   *
   * Parse the JOIN command:
   *
   * ```
   * <type> JOIN identifier [ AS identifier ] ON expression [, expression [, ... ]]
   * ```
   *
   * @param ctx the parse tree
   */
  exitJoinCommand(ctx: JoinCommandContext): void {
    if (this.inFork) {
      return;
    }
    const command = createJoinCommand(ctx);

    this.ast.push(command);
  }

  enterForkCommand() {
    this.inFork = true;
  }

  /**
   * NOTE — every new command supported in fork needs to be added
   * to createForkCommand!
   */
  exitForkCommand(ctx: ForkCommandContext): void {
    const command = createForkCommand(ctx);

    this.ast.push(command);

    this.inFork = false;
  }

  /**
   * Exit a parse tree produced by `esql_parser.changePointCommand`.
   *
   * Parse the CHANGE_POINT command:
   *
   * CHANGE_POINT <value> [ ON <key> ] [ AS <target-type>, <target-pvalue> ]
   *
   * @param ctx the parse tree
   */
  exitChangePointCommand(ctx: ChangePointCommandContext): void {
    if (this.inFork) {
      return;
    }
    const command = createChangePointCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.rerankCommand`.
   *
   * Parse the RERANK command:
   *
   * RERANK <query> ON <fields> WITH <referenceId>
   *
   * @param ctx the parse tree
   */
  exitRerankCommand(ctx: RerankCommandContext): void {
    const command = createRerankCommand(ctx);

    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.completionCommand`.
   *
   * Parse the COMPLETION command:
   *
   * COMPLETION <prompt> WITH <inferenceId> [ AS <targetField> ]
   *
   * @param ctx the parse tree
   */
  exitCompletionCommand(ctx: CompletionCommandContext): void {
    if (this.inFork) {
      return;
    }
    const command = createCompletionCommand(ctx);
    this.ast.push(command);
  }

  exitSampleCommand(ctx: SampleCommandContext): void {
    if (this.inFork) {
      return;
    }
    const command = createSampleCommand(ctx);
    this.ast.push(command);
  }

  /**
   * Exit a parse tree produced by `esql_parser.rrfCommand`.
   *
   * Parse the RRF (Reciprocal Rank Fusion) command:
   *
   * RRF
   *
   * @param ctx the parse tree
   */
  exitRrfCommand(ctx: RrfCommandContext): void {
    const command = createCommand('rrf', ctx);
    this.ast.push(command);
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
