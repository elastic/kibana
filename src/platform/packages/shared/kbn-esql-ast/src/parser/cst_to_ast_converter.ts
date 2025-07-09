/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as antlr from 'antlr4';
import * as cst from '../antlr/esql_parser';
import * as ast from '../types';
import { type AstNodeParserFields, Builder } from '../builder';
import { isCommand } from '../ast/is';
import { createLimitCommand } from './factories/limit';
import {
  computeLocationExtends,
  createColumn,
  createFunction,
  createIdentifierOrParam,
  createLiteralString,
  createOption,
  createUnknownItem,
  textExistsAndIsValid,
  visitSource,
} from './factories';
import {
  collectAllAggFields,
  collectAllColumnIdentifiers,
  collectAllFields,
  collectBooleanExpression,
  getConstant,
  visitByOption,
  visitPrimaryExpression,
  visitRenameClauses,
  visitValueExpression,
} from './walkers';
import { getPosition } from './helpers';
import { createStatsCommand } from './factories/stats';
import { createSortCommand } from './factories/sort';
import type { Parser } from './parser';
import { createDissectCommand } from './factories/dissect';
import { createEnrichCommand } from './factories/enrich';
import { createRerankCommand } from './factories/rerank';

/**
 * Transforms an ANTLR ES|QL Concrete Syntax Tree (CST) into a
 * Kibana Abstract Syntax Tree (AST).
 *
 * Most of the methods in this class are 1-to-1 mapping from CST-to-AST,
 * they are designed to convert specific CST nodes into their
 * corresponding AST nodes.
 */
export class CstToAstConverter {
  constructor(protected readonly parser: Parser) {}

  // -------------------------------------------------------------------- utils

  /**
   * @todo Rename to `getParserFields`.
   */
  private createParserFields(ctx: antlr.ParserRuleContext): AstNodeParserFields {
    return {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    };
  }

  private createParserFieldsFromToken(
    token: antlr.Token,
    text: string = token.text
  ): AstNodeParserFields {
    const fields: AstNodeParserFields = {
      text,
      location: getPosition(token, token),
      incomplete: false,
    };

    return fields;
  }

  private toIdentifierFromTerminalNode(node: antlr.TerminalNode): ast.ESQLIdentifier {
    return this.toIdentifierFromToken(node.symbol);
  }

  private toIdentifierFromToken(token: antlr.Token): ast.ESQLIdentifier {
    const name = token.text;

    return Builder.identifier({ name }, this.createParserFieldsFromToken(token));
  }

  // -------------------------------------------------------------------- query

  fromSingleStatement(ctx: cst.SingleStatementContext): ast.ESQLAstQueryExpression | undefined {
    return this.fromAnyQuery(ctx.query());
  }

  private fromAnyQuery(ctx: cst.QueryContext): ast.ESQLAstQueryExpression | undefined {
    if (ctx instanceof cst.CompositeQueryContext) {
      return this.fromCompositeQuery(ctx);
    } else {
      if (ctx instanceof cst.QueryContext) {
        return this.fromQuery(ctx);
      } else {
        return undefined;
      }
    }
  }

  private fromCompositeQuery(
    ctx: cst.CompositeQueryContext
  ): ast.ESQLAstQueryExpression | undefined {
    const query = this.fromAnyQuery(ctx.query());

    if (!query) {
      return;
    }

    const processingCommandCtx = ctx.processingCommand();
    const processingCommand = this.fromProcessingCommand(processingCommandCtx);

    if (processingCommand) {
      query.commands.push(processingCommand);
    }

    return query;
  }

  private fromSingleCommandQuery(ctx: cst.SingleCommandQueryContext): ast.ESQLCommand | undefined {
    return this.fromSourceCommand(ctx.sourceCommand());
  }

  private fromQuery(ctx: cst.QueryContext): ast.ESQLAstQueryExpression | undefined {
    const children = ctx.children;

    if (!children) {
      return;
    }

    const length = children.length;

    if (!length) {
      return;
    }

    const commands: ast.ESQLAstQueryExpression['commands'] = [];

    for (let i = 0; i < length; i++) {
      const childCtx = children[i];
      const child = this.fromAny(childCtx);

      if (isCommand(child)) {
        commands.push(child);
      }
    }

    return Builder.expression.query(commands, this.createParserFields(ctx));
  }

  private fromAny(ctx: antlr.ParseTree): ast.ESQLProperNode | undefined {
    if (ctx instanceof cst.SingleCommandQueryContext) {
      return this.fromSingleCommandQuery(ctx);
    } else if (ctx instanceof cst.SourceCommandContext) {
      return this.fromSourceCommand(ctx);
    } else if (ctx instanceof cst.ProcessingCommandContext) {
      return this.fromProcessingCommand(ctx);
    }

    return undefined;
  }

  private fromSubqueryExpression(
    ctx: cst.SubqueryExpressionContext
  ): ast.ESQLAstQueryExpression | undefined {
    const queryCtx = ctx.query();
    if (queryCtx instanceof cst.QueryContext) {
      return this.fromQuery(queryCtx);
    } else {
      return undefined;
    }
  }

  // ----------------------------------------------------------------- commands

  private fromSourceCommand(ctx: cst.SourceCommandContext): ast.ESQLCommand | undefined {
    const fromCommandCtx = ctx.fromCommand();

    if (fromCommandCtx) {
      return this.fromFromCommand(fromCommandCtx);
    }

    const rowCommandCtx = ctx.rowCommand();

    if (rowCommandCtx) {
      return this.fromRowCommand(rowCommandCtx);
    }

    const tsCommandCtx = ctx.timeSeriesCommand();

    if (tsCommandCtx) {
      return this.fromTimeseriesCommand(tsCommandCtx);
    }

    const explainCommandCtx = ctx.explainCommand();

    if (explainCommandCtx) {
      return this.fromExplainCommand(explainCommandCtx);
    }

    const showCommandCtx = ctx.showCommand();

    if (showCommandCtx) {
      return this.fromShowCommand(showCommandCtx);
    }

    // throw new Error(`Unknown source command: ${this.getSrc(ctx)}`);
  }

  private fromProcessingCommand(ctx: cst.ProcessingCommandContext): ast.ESQLCommand | undefined {
    const limitCommandCtx = ctx.limitCommand();

    if (limitCommandCtx) {
      return createLimitCommand(limitCommandCtx);
    }

    const evalCommandCtx = ctx.evalCommand();

    if (evalCommandCtx) {
      return this.fromEvalCommand(evalCommandCtx);
    }

    const whereCommandCtx = ctx.whereCommand();

    if (whereCommandCtx) {
      return this.fromWhereCommand(whereCommandCtx);
    }

    const keepCommandCtx = ctx.keepCommand();

    if (keepCommandCtx) {
      return this.fromKeepCommand(keepCommandCtx);
    }

    const statsCommandCtx = ctx.statsCommand();

    if (statsCommandCtx) {
      return this.fromStatsCommand(statsCommandCtx);
    }

    const sortCommandCtx = ctx.sortCommand();

    if (sortCommandCtx) {
      return this.fromSortCommand(sortCommandCtx);
    }

    const dropCommandCtx = ctx.dropCommand();

    if (dropCommandCtx) {
      return this.fromDropCommand(dropCommandCtx);
    }

    const renameCommandCtx = ctx.renameCommand();

    if (renameCommandCtx) {
      return this.fromRenameCommand(renameCommandCtx);
    }

    const dissectCommandCtx = ctx.dissectCommand();

    if (dissectCommandCtx) {
      return this.fromDissectCommand(dissectCommandCtx);
    }

    const grokCommandCtx = ctx.grokCommand();

    if (grokCommandCtx) {
      return this.fromGrokCommand(grokCommandCtx);
    }

    const enrichCommandCtx = ctx.enrichCommand();

    if (enrichCommandCtx) {
      return this.fromEnrichCommand(enrichCommandCtx);
    }

    const mvExpandCommandCtx = ctx.mvExpandCommand();

    if (mvExpandCommandCtx) {
      return this.fromMvExpandCommand(mvExpandCommandCtx);
    }

    const joinCommandCtx = ctx.joinCommand();

    if (joinCommandCtx) {
      return this.fromJoinCommand(joinCommandCtx);
    }

    const changePointCommandCtx = ctx.changePointCommand();

    if (changePointCommandCtx) {
      return this.fromChangePointCommand(changePointCommandCtx);
    }

    const completionCommandCtx = ctx.completionCommand();

    if (completionCommandCtx) {
      return this.fromCompletionCommand(completionCommandCtx);
    }

    const sampleCommandCtx = ctx.sampleCommand();

    if (sampleCommandCtx) {
      return this.fromSampleCommand(sampleCommandCtx);
    }

    const inlinestatsCommandCtx = ctx.inlinestatsCommand();

    if (inlinestatsCommandCtx) {
      return this.fromInlinestatsCommand(inlinestatsCommandCtx);
    }

    const rerankCommandCtx = ctx.rerankCommand();

    if (rerankCommandCtx) {
      return this.fromRerankCommand(rerankCommandCtx);
    }

    const rrfCommandCtx = ctx.rrfCommand();

    if (rrfCommandCtx) {
      return this.fromRrfCommand(rrfCommandCtx);
    }

    const fuseCommandCtx = ctx.fuseCommand();

    if (fuseCommandCtx) {
      return this.fromFuseCommand(fuseCommandCtx);
    }

    const forkCommandCtx = ctx.forkCommand();

    if (forkCommandCtx) {
      return this.fromForkCommand(forkCommandCtx);
    }

    // throw new Error(`Unknown processing command: ${this.getSrc(ctx)}`);
  }

  private createCommand<
    Name extends string,
    Cmd extends ast.ESQLCommand<Name> = ast.ESQLCommand<Name>
  >(name: Name, ctx: antlr.ParserRuleContext, partial?: Partial<Cmd>): Cmd {
    const parserFields = this.createParserFields(ctx);
    const command = Builder.command({ name, args: [] }, parserFields) as Cmd;

    if (partial) {
      Object.assign(command, partial);
    }

    return command;
  }

  // ------------------------------------------------------------------ EXPLAIN

  private fromExplainCommand(ctx: cst.ExplainCommandContext): ast.ESQLCommand<'explain'> {
    const command = this.createCommand('explain', ctx);
    const arg = this.fromSubqueryExpression(ctx.subqueryExpression());

    if (arg) {
      command.args.push(arg);
    }

    return command;
  }

  // --------------------------------------------------------------------- FROM

  private fromFromCommand(ctx: cst.FromCommandContext): ast.ESQLCommand<'from'> {
    const command = this.createCommand('from', ctx);
    const indexPatternCtx = ctx.indexPatternAndMetadataFields();
    const metadataCtx = indexPatternCtx.metadata();
    const sources = indexPatternCtx
      .getTypedRuleContexts(cst.IndexPatternContext as any)
      .map((sourceCtx) => visitSource(sourceCtx));

    command.args.push(...sources);

    if (metadataCtx && metadataCtx.METADATA()) {
      const name = metadataCtx.METADATA().getText().toLowerCase();
      const option = createOption(name, metadataCtx);
      const optionArgs = collectAllColumnIdentifiers(metadataCtx);

      option.args.push(...optionArgs);
      command.args.push(option);
    }

    return command;
  }

  // ---------------------------------------------------------------------- ROW

  private fromRowCommand(ctx: cst.RowCommandContext): ast.ESQLCommand<'row'> {
    const command = this.createCommand('row', ctx);
    const fields = collectAllFields(ctx.fields());

    command.args.push(...fields);

    return command;
  }

  // ----------------------------------------------------------------------- TS

  private fromTimeseriesCommand(ctx: cst.TimeSeriesCommandContext): ast.ESQLCommand<'ts'> {
    const command = this.createCommand('ts', ctx);
    const indexPatternCtx = ctx.indexPatternAndMetadataFields();
    const metadataCtx = indexPatternCtx.metadata();
    const sources = indexPatternCtx
      .getTypedRuleContexts(cst.IndexPatternContext as any)
      .map((sourceCtx) => visitSource(sourceCtx));

    command.args.push(...sources);

    if (metadataCtx && metadataCtx.METADATA()) {
      const name = metadataCtx.METADATA().getText().toLowerCase();
      const option = createOption(name, metadataCtx);
      const optionArgs = collectAllColumnIdentifiers(metadataCtx);

      option.args.push(...optionArgs);
      command.args.push(option);
    }

    return command;
  }

  // --------------------------------------------------------------------- SHOW

  private fromShowCommand(ctx: cst.ShowCommandContext): ast.ESQLCommand<'show'> {
    const command = this.createCommand('show', ctx);

    if (ctx instanceof cst.ShowInfoContext) {
      const infoCtx = ctx as cst.ShowInfoContext;
      const arg = this.toIdentifierFromTerminalNode(infoCtx.INFO());

      arg.name = arg.name.toUpperCase();

      command.args.push(arg);
    }

    return command;
  }

  // --------------------------------------------------------------------- EVAL

  private fromEvalCommand(ctx: cst.EvalCommandContext): ast.ESQLCommand<'eval'> {
    const command = this.createCommand('eval', ctx);
    const fields = collectAllFields(ctx.fields());

    command.args.push(...fields);

    return command;
  }

  // -------------------------------------------------------------------- WHERE

  private fromWhereCommand(ctx: cst.WhereCommandContext): ast.ESQLCommand<'where'> {
    const command = this.createCommand('where', ctx);

    const expressions = collectBooleanExpression(ctx.booleanExpression());

    command.args.push(expressions[0]);

    return command;
  }

  // --------------------------------------------------------------------- KEEP

  private fromKeepCommand(ctx: cst.KeepCommandContext): ast.ESQLCommand<'keep'> {
    const command = this.createCommand('keep', ctx);
    const identifiers = collectAllColumnIdentifiers(ctx);

    command.args.push(...identifiers);

    return command;
  }

  // -------------------------------------------------------------------- STATS

  private fromStatsCommand(ctx: cst.StatsCommandContext): ast.ESQLCommand<'stats'> {
    const command = createStatsCommand(ctx);

    return command;
  }

  // -------------------------------------------------------------------- SORT

  private fromSortCommand(ctx: cst.SortCommandContext): ast.ESQLCommand<'sort'> {
    const command = createSortCommand(ctx);

    return command;
  }

  // -------------------------------------------------------------------- DROP

  private fromDropCommand(ctx: cst.DropCommandContext): ast.ESQLCommand<'drop'> {
    const command = this.createCommand('drop', ctx);
    const identifiers = collectAllColumnIdentifiers(ctx);

    command.args.push(...identifiers);

    return command;
  }

  // ------------------------------------------------------------------- RENAME

  private fromRenameCommand(ctx: cst.RenameCommandContext): ast.ESQLCommand<'rename'> {
    const command = this.createCommand('rename', ctx);
    const renameArgs = visitRenameClauses(ctx.renameClause_list());

    command.args.push(...renameArgs);

    return command;
  }

  // ------------------------------------------------------------------ DISSECT

  private fromDissectCommand(ctx: cst.DissectCommandContext): ast.ESQLCommand<'dissect'> {
    const command = createDissectCommand(ctx);

    return command;
  }

  // --------------------------------------------------------------------- GROK

  private fromGrokCommand(ctx: cst.GrokCommandContext): ast.ESQLCommand<'grok'> {
    const command = this.createCommand('grok', ctx);
    const primaryExpression = visitPrimaryExpression(ctx.primaryExpression());
    const stringContext = ctx.string_();
    const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
    const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

    command.args.push(primaryExpression);

    if (doParseStringAndOptions) {
      const stringNode = createLiteralString(stringContext);

      command.args.push(stringNode);
    }

    return command;
  }

  // ------------------------------------------------------------------- ENRICH

  private fromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLCommand<'enrich'> {
    const command = createEnrichCommand(ctx);

    return command;
  }

  // ---------------------------------------------------------------- MV_EXPAND

  private fromMvExpandCommand(ctx: cst.MvExpandCommandContext): ast.ESQLCommand<'mv_expand'> {
    const command = this.createCommand('mv_expand', ctx);
    const identifiers = collectAllColumnIdentifiers(ctx);

    command.args.push(...identifiers);

    return command;
  }

  // --------------------------------------------------------------------- JOIN

  private fromJoinCommand(ctx: cst.JoinCommandContext): ast.ESQLAstJoinCommand {
    const command = this.createCommand<'join', ast.ESQLAstJoinCommand>('join', ctx);

    // Pick-up the <TYPE> of the command.
    command.commandType = (
      ctx._type_?.text ?? 'lookup'
    ).toLocaleLowerCase() as ast.ESQLAstJoinCommand['commandType'];

    const joinTarget = this.fromJoinTarget(ctx.joinTarget());
    const joinCondition = ctx.joinCondition();
    const onOption = createOption('on', joinCondition);
    const joinPredicates: ast.ESQLAstItem[] = onOption.args;

    for (const joinPredicateCtx of joinCondition.joinPredicate_list()) {
      const expression = visitValueExpression(joinPredicateCtx.valueExpression());

      if (expression) {
        joinPredicates.push(expression);
      }
    }

    command.args.push(joinTarget);

    if (onOption.args.length) {
      command.args.push(onOption);
    }

    return command;
  }

  private fromJoinTarget(ctx: cst.JoinTargetContext): ast.ESQLSource | ast.ESQLIdentifier {
    return visitSource(ctx._index);
  }

  // ------------------------------------------------------------- CHANGE_POINT

  private fromChangePointCommand = (
    ctx: cst.ChangePointCommandContext
  ): ast.ESQLAstChangePointCommand => {
    const value = createColumn(ctx._value);
    const command = this.createCommand<'change_point', ast.ESQLAstChangePointCommand>(
      'change_point',
      ctx,
      {
        value,
      }
    );

    command.args.push(value);

    if (ctx._key && ctx._key.getText()) {
      const key = createColumn(ctx._key);
      const option = Builder.option(
        {
          name: 'on',
          args: [key],
        },
        {
          location: getPosition(ctx.ON().symbol, ctx._key.stop),
        }
      );

      command.key = key;
      command.args.push(option);
    }

    if (ctx._targetType && ctx._targetPvalue) {
      const type = createColumn(ctx._targetType);
      const pvalue = createColumn(ctx._targetPvalue);
      const option = Builder.option(
        {
          name: 'as',
          args: [type, pvalue],
        },
        {
          location: getPosition(ctx.AS().symbol, ctx._targetPvalue.stop),
        }
      );

      command.target = {
        type,
        pvalue,
      };
      command.args.push(option);
    }

    return command;
  };

  // --------------------------------------------------------------- COMPLETION

  private fromCompletionCommand(ctx: cst.CompletionCommandContext): ast.ESQLAstCompletionCommand {
    const command = this.createCommand<'completion', ast.ESQLAstCompletionCommand>(
      'completion',
      ctx
    );

    if (ctx._targetField && ctx.ASSIGN()) {
      const targetField = createColumn(ctx._targetField);

      const prompt = visitPrimaryExpression(ctx._prompt) as ast.ESQLSingleAstItem;
      command.prompt = prompt;

      const assignment = createFunction(
        ctx.ASSIGN().getText(),
        ctx,
        undefined,
        'binary-expression'
      );
      assignment.args.push(targetField, prompt);
      // update the location of the assign based on arguments
      assignment.location = computeLocationExtends(assignment);

      command.targetField = targetField;
      command.args.push(assignment);
    } else if (ctx._prompt) {
      const prompt = visitPrimaryExpression(ctx._prompt) as ast.ESQLSingleAstItem;
      command.prompt = prompt;
      command.args.push(prompt);
    } else {
      // When the user is typing a column as prompt i.e: | COMPLETION message^,
      // ANTLR does not know if it is trying to type a prompt
      // or a target field, so it does not return neither _prompt nor _targetField. We fill the AST
      // with an unknown item until the user inserts the next keyword and breaks the tie.
      const unknownItem = createUnknownItem(ctx);
      unknownItem.text = ctx.getText().replace(/^completion/i, '');

      command.prompt = unknownItem;
      command.args.push(unknownItem);
    }

    const withCtx = ctx.WITH();

    let inferenceId: ast.ESQLSingleAstItem;
    let withIncomplete = true;

    const withText = withCtx?.getText();
    const inferenceIdText = ctx._inferenceId?.getText();
    if (withText?.includes('missing') && /(?:w|wi|wit|with)$/i.test(inferenceIdText)) {
      // This case is when the WITH keyword is partially typed, and no inferenceId has been provided e.g. 'COMPLETION "prompt" WI'
      // (the parser incorrectly recognizes the partial WITH keyword as the inferenceId)
      inferenceId = Builder.identifier('', { incomplete: true });
    } else {
      if (!inferenceIdText) {
        inferenceId = Builder.identifier('', { incomplete: true });
      } else {
        withIncomplete = false;
        inferenceId = createIdentifierOrParam(ctx._inferenceId)!;
      }
    }

    command.inferenceId = inferenceId;

    const optionWith = Builder.option(
      {
        name: 'with',
        args: [inferenceId],
      },
      {
        incomplete: withIncomplete,
        ...(withCtx && ctx._inferenceId
          ? {
              location: getPosition(withCtx.symbol, ctx._inferenceId.stop),
            }
          : undefined),
      }
    );

    command.args.push(optionWith);

    return command;
  }

  // ------------------------------------------------------------------- SAMPLE

  private fromSampleCommand(ctx: cst.SampleCommandContext): ast.ESQLCommand<'sample'> {
    const command = this.createCommand('sample', ctx);

    if (ctx.constant()) {
      const probability = getConstant(ctx.constant());
      if (probability != null) {
        command.args.push(probability);
      }
    }

    return command;
  }

  // -------------------------------------------------------------- INLINESTATS

  private fromInlinestatsCommand(
    ctx: cst.InlinestatsCommandContext
  ): ast.ESQLCommand<'inlinestats'> {
    const command = this.createCommand('inlinestats', ctx);

    // STATS expression is optional
    if (ctx._stats) {
      command.args.push(...collectAllAggFields(ctx.aggFields()));
    }
    if (ctx._grouping) {
      command.args.push(...visitByOption(ctx, ctx.fields()));
    }

    return command;
  }

  // ------------------------------------------------------------------- RERANK

  private fromRerankCommand(ctx: cst.RerankCommandContext): ast.ESQLAstRerankCommand {
    const command = createRerankCommand(ctx);

    return command;
  }

  // ---------------------------------------------------------------------- RRF

  private fromRrfCommand(ctx: cst.RrfCommandContext): ast.ESQLCommand<'rrf'> {
    const command = this.createCommand('rrf', ctx);

    return command;
  }

  // --------------------------------------------------------------------- FUSE

  private fromFuseCommand(ctx: cst.FuseCommandContext): ast.ESQLCommand<'fuse'> {
    const command = this.createCommand('fuse', ctx);

    return command;
  }

  // --------------------------------------------------------------------- FORK

  private fromForkCommand(ctx: cst.ForkCommandContext): ast.ESQLCommand<'fork'> {
    const subQueriesCtx = ctx.forkSubQueries();
    const subQueryCtxs = subQueriesCtx.forkSubQuery_list();
    const args = subQueryCtxs.map((subQueryCtx) => this.fromForkSubQuery(subQueryCtx));
    const command = this.createCommand<'fork'>('fork', ctx, { args });

    return command;
  }

  private fromForkSubQuery(ctx: cst.ForkSubQueryContext): ast.ESQLAstQueryExpression {
    const commands: ast.ESQLCommand[] = [];
    const collectCommand = (cmdCtx: cst.ForkSubQueryProcessingCommandContext) => {
      const processingCommandCtx = cmdCtx.processingCommand();
      const command = this.fromProcessingCommand(processingCommandCtx);

      if (command) {
        commands.push(command);
      }
    };

    let commandCtx: cst.ForkSubQueryCommandContext | undefined = ctx.forkSubQueryCommand();

    while (commandCtx) {
      if (commandCtx instanceof cst.ForkSubQueryProcessingCommandContext) {
        collectCommand(commandCtx);
        break;
      } else if (commandCtx instanceof cst.SingleForkSubQueryCommandContext) {
        collectCommand(commandCtx.forkSubQueryProcessingCommand());
        break;
      } else if (commandCtx instanceof cst.CompositeForkSubQueryContext) {
        collectCommand(commandCtx.forkSubQueryProcessingCommand());
        commandCtx = commandCtx.forkSubQueryCommand();
      }
    }

    commands.reverse();

    const parserFields = this.createParserFields(ctx);
    const query = Builder.expression.query(commands, parserFields);

    return query;
  }
}
