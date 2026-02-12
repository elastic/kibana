/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as antlr from 'antlr4';
import * as cst from '../antlr/esql_parser';
import type * as ast from '../../types';
import { isCommand, isStringLiteral } from '../../ast/is';
import { LeafPrinter } from '../../pretty_print';
import { getPosition } from './tokens';
import { nonNullable, unescapeColumn } from './helpers';
import { firstItem, lastItem, resolveItem, singleItems } from '../../ast/visitor/utils';
import { type AstNodeParserFields, Builder } from '../../ast/builder';
import { type ArithmeticUnaryContext } from '../antlr/esql_parser';
import { PromQLParser } from '../../embedded_languages/promql/parser/parser';
import type { AstNodeTemplate } from '../../ast/builder';
import type { Parser } from './parser';
import type { PromQLAstQueryExpression } from '../../embedded_languages/promql/types';

const textExistsAndIsValid = (text: string | undefined): text is string =>
  !!(text && !/<missing /.test(text));

type ESQLAstMatchBooleanExpression = ast.ESQLColumn | ast.ESQLBinaryExpression | ast.ESQLInlineCast;

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

  private getParserFields(ctx: antlr.ParserRuleContext): AstNodeParserFields {
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

  private createParserFieldsFromTerminalNode(node: antlr.TerminalNode): AstNodeParserFields {
    const text = node.getText();
    const symbol = node.symbol;
    const fields: AstNodeParserFields = {
      text,
      location: getPosition(symbol, symbol),
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

  private fromParserRuleToUnknown(ctx: antlr.ParserRuleContext): ast.ESQLUnknownItem {
    return {
      type: 'unknown',
      name: 'unknown',
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    };
  }

  /**
   * Extends `fn.location` to cover all its arguments.
   *
   * @deprecated This should never have been necessary. Function location should be
   *     accurately set during parsing or initial AST construction.
   */
  private extendLocationToArgs(fn: ast.ESQLFunction) {
    const location = fn.location;
    if (fn.args) {
      // get min location navigating in depth keeping the left/first arg
      location.min = this.walkFunctionStructure(fn.args, location, 'min', () => 0);
      // get max location navigating in depth keeping the right/last arg
      location.max = this.walkFunctionStructure(
        fn.args,
        location,
        'max',
        (args) => args.length - 1
      );
      // in case of empty array as last arg, bump the max location by 3 chars (empty brackets)
      if (
        Array.isArray(fn.args[fn.args.length - 1]) &&
        !(fn.args[fn.args.length - 1] as ast.ESQLAstItem[]).length
      ) {
        location.max += 3;
      }
    }
    return location;
  }

  /**
   * @deprecated Do not use. This method will be removed once
   *     `extendLocationToArgs` is removed.
   */
  private walkFunctionStructure(
    args: ast.ESQLAstItem[],
    initialLocation: ast.ESQLLocation,
    prop: 'min' | 'max',
    getNextItemIndex: (arg: ast.ESQLAstItem[]) => number
  ) {
    let nextArg: ast.ESQLAstItem | undefined = args[getNextItemIndex(args)];
    const location = { ...initialLocation };
    while (Array.isArray(nextArg) || nextArg) {
      if (Array.isArray(nextArg)) {
        nextArg = nextArg[getNextItemIndex(nextArg)];
      } else {
        location[prop] = Math[prop](location[prop], nextArg.location[prop]);
        if (nextArg.type === 'function') {
          nextArg = nextArg.args[getNextItemIndex(nextArg.args)];
        } else {
          nextArg = undefined;
        }
      }
    }
    return location[prop];
  }

  // -------------------------------------------------------------------- query

  fromStatements(ctx: cst.StatementsContext): ast.ESQLAstQueryExpression | undefined {
    const setCommandCtxs = ctx.setCommand_list();
    const singleStatement = ctx.singleStatement();

    let header: ast.ESQLAstSetHeaderCommand[] | undefined;
    // Process SET instructions and create header if they exist
    if (setCommandCtxs && setCommandCtxs.length > 0) {
      header = this.fromSetCommands(setCommandCtxs);
    }

    // Get the main query from singleStatement
    const query = this.fromSingleStatement(singleStatement);

    if (!query) {
      const emptyQuery = Builder.expression.query([], this.getParserFields(ctx), header);
      emptyQuery.incomplete = true;
      return emptyQuery;
    }

    query.header = header;

    return query;
  }

  fromSingleStatement(ctx: cst.SingleStatementContext): ast.ESQLAstQueryExpression | undefined {
    if (!ctx) return undefined;
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

    return Builder.expression.query(commands, this.getParserFields(ctx));
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

  // ------------------------------------------------------------- query header

  private fromSetCommands(setCommandCtxs: cst.SetCommandContext[]): ast.ESQLAstSetHeaderCommand[] {
    const setCommands: ast.ESQLAstSetHeaderCommand[] = setCommandCtxs
      .map((setCommandCtx) => this.fromSetCommand(setCommandCtx))
      .filter(nonNullable);
    return setCommands;
  }

  // ---------------------------------------------------------------------- SET

  private fromSetCommand(ctx: cst.SetCommandContext): ast.ESQLAstSetHeaderCommand {
    const setFieldCtx = ctx.setField();
    const binaryExpression = this.fromSetFieldContext(setFieldCtx);

    const args = binaryExpression ? [binaryExpression] : [];
    const command = Builder.header.command.set(args, {}, this.getParserFields(ctx));

    return command;
  }

  private fromSetFieldContext(ctx: cst.SetFieldContext): ast.ESQLBinaryExpression<'='> | null {
    const leftCtx = ctx.identifier();
    const constantCtx = ctx.constant();
    const mapExpressionCtx = ctx.mapExpression();
    const assignToken = ctx.ASSIGN();

    if (!leftCtx) {
      return null;
    }

    const left = this.toIdentifierFromContext(leftCtx);

    // Handle constant value
    if (constantCtx) {
      const right = this.fromConstantToArray(constantCtx) as ast.ESQLLiteral;
      const expression = this.toBinaryExpression('=', ctx, [left, right]);

      if (left.incomplete || right.incomplete) {
        expression.incomplete = true;
      }

      return expression;
    }

    // Handle map expression
    if (mapExpressionCtx) {
      const right = this.fromMapExpression(mapExpressionCtx);
      const expression = this.toBinaryExpression('=', ctx, [left, right]);

      if (left.incomplete || right?.incomplete) {
        expression.incomplete = true;
      }

      return expression;
    }
    // Handle missing value (incomplete assignment)
    if (assignToken) {
      const expression = this.toBinaryExpression('=', ctx, [left, []]);
      expression.incomplete = true;
      expression.location = {
        min: left.location.min,
        max: assignToken.symbol.stop,
      };
      return expression;
    }

    return null;
  }

  private toIdentifierFromContext(ctx: cst.IdentifierContext): ast.ESQLIdentifier {
    const identifierToken = ctx.UNQUOTED_IDENTIFIER() || ctx.QUOTED_IDENTIFIER();

    if (identifierToken) {
      return this.toIdentifierFromTerminalNode(identifierToken);
    }

    // Fallback: create identifier from the full context text
    return Builder.identifier({ name: ctx.getText() }, this.getParserFields(ctx));
  }

  // ----------------------------------------------------------------- commands

  public fromSourceCommand(ctx: cst.SourceCommandContext): ast.ESQLCommand | undefined {
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

    const promqlCommandCtx = ctx.promqlCommand();

    if (promqlCommandCtx) {
      return this.fromPromqlCommand(promqlCommandCtx);
    }

    // throw new Error(`Unknown source command: ${this.getSrc(ctx)}`);
  }

  public fromProcessingCommand(ctx: cst.ProcessingCommandContext): ast.ESQLCommand | undefined {
    const limitCommandCtx = ctx.limitCommand();

    if (limitCommandCtx) {
      return this.fromLimitCommand(limitCommandCtx);
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

    const inlinestatsCommandCtx = ctx.inlineStatsCommand();

    if (inlinestatsCommandCtx) {
      return this.fromInlinestatsCommand(inlinestatsCommandCtx);
    }

    const rerankCommandCtx = ctx.rerankCommand();

    if (rerankCommandCtx) {
      return this.fromRerankCommand(rerankCommandCtx);
    }
    const fuseCommandCtx = ctx.fuseCommand();

    if (fuseCommandCtx) {
      return this.fromFuseCommand(fuseCommandCtx);
    }

    const forkCommandCtx = ctx.forkCommand();

    if (forkCommandCtx) {
      return this.fromForkCommand(forkCommandCtx);
    }

    const mmrCommand = ctx.mmrCommand();

    if (mmrCommand) {
      return this.fromMmrCommand(mmrCommand);
    }

    // throw new Error(`Unknown processing command: ${this.getSrc(ctx)}`;
  }

  private createCommand<
    Name extends string,
    Cmd extends ast.ESQLCommand<Name> = ast.ESQLCommand<Name>
  >(name: Name, ctx: antlr.ParserRuleContext, partial?: Partial<Cmd>): Cmd {
    const parserFields = this.getParserFields(ctx);
    const command = Builder.command({ name, args: [] }, parserFields) as Cmd;

    if (partial) {
      Object.assign(command, partial);
    }

    return command;
  }

  private toOption(
    name: string,
    ctx: antlr.ParserRuleContext,
    args: ast.ESQLAstItem[] = [],
    incomplete?: boolean
  ): ast.ESQLCommandOption {
    return {
      type: 'option',
      name,
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      args,
      incomplete:
        incomplete ??
        (Boolean(ctx.exception) || [...singleItems(args)].some((arg) => arg.incomplete)),
    };
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

  private fromFromCommand(ctx: cst.FromCommandContext): ast.ESQLCommand<'from'> | undefined {
    // When parsing queries with nested empty subqueries like "FROM a, (FROM b, ())",
    // ANTLR incorrectly identifies the empty parentheses "()" as a fromCommand context.
    // This phantom context contains only closing parentheses (e.g., ")" or "))")
    // without any actual FROM keyword, which would lead to malformed AST nodes.
    if (!ctx.FROM()) {
      return undefined;
    }

    const command = this.fromFromCompatibleCommand('from', ctx);
    const hasValidText = textExistsAndIsValid(ctx.getText());

    if (!hasValidText) {
      command.incomplete = true;
    }

    return command;
  }

  private fromFromCompatibleCommand<Name extends string>(
    commandName: Name,
    ctx: antlr.ParserRuleContext & Pick<cst.FromCommandContext, 'indexPatternAndMetadataFields'>
  ): ast.ESQLCommand<Name> {
    const command = this.createCommand(commandName, ctx);
    const indexPatternAndMetadataCtx = ctx.indexPatternAndMetadataFields();
    const metadataCtx = indexPatternAndMetadataCtx.metadata();
    const indexPatternOrSubqueryCtxs = indexPatternAndMetadataCtx.indexPatternOrSubquery_list();
    const sources = indexPatternOrSubqueryCtxs
      .map((indexPatternOrSubqueryCtx) => {
        const indexPatternCtx = indexPatternOrSubqueryCtx.indexPattern();
        if (indexPatternCtx) {
          return this.toSource(indexPatternCtx);
        }

        const subqueryCtx = indexPatternOrSubqueryCtx.subquery();
        if (subqueryCtx) {
          return this.fromSubquery(subqueryCtx);
        }

        return null;
      })
      .filter((source): source is ast.ESQLSource => source !== null);

    command.args.push(...sources);

    if (metadataCtx && metadataCtx.METADATA()) {
      const name = metadataCtx.METADATA().getText().toLowerCase();
      const option = this.toOption(name, metadataCtx);
      const optionArgs = this.toColumnsFromCommand(metadataCtx);

      option.args.push(...optionArgs);
      command.args.push(option);
    }

    return command;
  }

  private fromSubquery(ctx: cst.SubqueryContext): ast.ESQLParens {
    const fromCommandCtx = ctx.fromCommand();
    const processingCommandCtxs = ctx.processingCommand_list();
    const commands: ast.ESQLCommand[] = [];

    if (fromCommandCtx) {
      const fromCommand = this.fromFromCommand(fromCommandCtx);

      if (fromCommand) {
        commands.push(fromCommand);
      }
    }

    for (const procCmdCtx of processingCommandCtxs) {
      const procCommand = this.fromProcessingCommand(procCmdCtx);

      if (procCommand) {
        commands.push(procCommand);
      }
    }

    const openParen = ctx.LP();
    const closeParen = ctx.RP();

    // ANTLR inserts tokens with text like "<missing ')'>" when they're missing
    const closeParenText = closeParen?.getText() ?? '';
    const hasCloseParen = closeParen && !/<missing /.test(closeParenText);
    const incomplete = Boolean(ctx.exception) || !hasCloseParen;

    const query = Builder.expression.query(commands, {
      ...this.getParserFields(ctx),
      incomplete,
    });

    return Builder.expression.parens(query, {
      incomplete: incomplete || query.incomplete,
      location: getPosition(
        openParen?.symbol ?? ctx.start,
        hasCloseParen ? closeParen.symbol : ctx.stop
      ),
    });
  }

  // ---------------------------------------------------------------------- ROW

  private fromRowCommand(ctx: cst.RowCommandContext): ast.ESQLCommand<'row'> {
    const command = this.createCommand('row', ctx);
    const fields = this.fromFields(ctx.fields());

    command.args.push(...fields);

    return command;
  }

  // ----------------------------------------------------------------------- TS

  private fromTimeseriesCommand(ctx: cst.TimeSeriesCommandContext): ast.ESQLCommand<'ts'> {
    return this.fromFromCompatibleCommand('ts', ctx);
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

  // -------------------------------------------------------------------- LIMIT

  private fromLimitCommand(ctx: cst.LimitCommandContext): ast.ESQLCommand<'limit'> {
    const command = this.createCommand('limit', ctx);
    if (ctx.constant()) {
      const limitValue = this.fromConstantToArray(ctx.constant());
      if (limitValue != null) {
        command.args.push(limitValue);
      }
    }

    return command;
  }

  // --------------------------------------------------------------------- EVAL

  private fromEvalCommand(ctx: cst.EvalCommandContext): ast.ESQLCommand<'eval'> {
    const command = this.createCommand('eval', ctx);
    const fields = this.fromFields(ctx.fields());

    command.args.push(...fields);

    return command;
  }

  // -------------------------------------------------------------------- WHERE

  private fromWhereCommand(ctx: cst.WhereCommandContext): ast.ESQLCommand<'where'> {
    const command = this.createCommand('where', ctx);
    const expression = this.fromBooleanExpressionToExpressionOrUnknown(ctx.booleanExpression());

    command.args.push(expression);

    return command;
  }

  // --------------------------------------------------------------------- KEEP

  private fromKeepCommand(ctx: cst.KeepCommandContext): ast.ESQLCommand<'keep'> {
    const args = this.fromQualifiedNamePatterns(ctx.qualifiedNamePatterns());
    const command = this.createCommand('keep', ctx, { args });

    return command;
  }

  private fromQualifiedNamePatterns(
    ctx: cst.QualifiedNamePatternsContext
  ): ast.ESQLAstExpression[] {
    const itemCtxs = ctx.qualifiedNamePattern_list();
    const result: ast.ESQLAstExpression[] = [];

    for (const itemCtx of itemCtxs) {
      const node = this.fromQualifiedNamePattern(itemCtx);

      result.push(node);
    }

    return result;
  }

  // -------------------------------------------------------------------- STATS

  private fromStatsCommand(ctx: cst.StatsCommandContext): ast.ESQLCommand<'stats'> {
    return this.fromStatsLikeCommand('stats', ctx);
  }

  private fromStatsLikeCommand<Name extends string>(
    name: Name,
    ctx: antlr.ParserRuleContext &
      Pick<cst.StatsCommandContext, '_stats' | '_grouping' | 'aggFields' | 'fields' | 'BY'>
  ): ast.ESQLCommand<Name> {
    const command = this.createCommand(name, ctx);

    if (ctx._stats) {
      command.args.push(...this.fromAggFields(ctx.aggFields()));
    }

    if (ctx._grouping) {
      const option = this.toByOption(ctx, ctx.fields());

      if (option) {
        command.args.push(option);
      }
    }

    return command;
  }

  private fromAggField(ctx: cst.AggFieldContext) {
    const fieldCtx = ctx.field();
    const field = this.fromField(fieldCtx);

    if (!field) {
      return;
    }

    const booleanExpression = ctx.booleanExpression();

    if (!booleanExpression) {
      return field;
    }

    const condition = this.fromBooleanExpressionToExpressionOrUnknown(booleanExpression);
    const aggField = Builder.expression.where(
      [field, condition],
      {},
      {
        location: {
          min: firstItem([resolveItem(field)])?.location?.min ?? 0,
          max: firstItem([resolveItem(condition)])?.location?.max ?? 0,
        },
      }
    );

    return aggField;
  }

  private toByOption(
    ctx: antlr.ParserRuleContext & Pick<cst.StatsCommandContext, 'BY'>,
    expr: cst.FieldsContext | undefined
  ): ast.ESQLCommandOption | undefined {
    const byCtx = ctx.BY();

    if (!byCtx || !expr) {
      return;
    }

    const option = this.toOption(byCtx.getText().toLowerCase(), ctx);

    option.args.push(...this.fromFields(expr));
    option.location.min = byCtx.symbol.start;

    const lastArg = lastItem(option.args);

    if (lastArg) option.location.max = lastArg.location.max;

    return option;
  }

  // --------------------------------------------------------------------- SORT

  private fromSortCommand(ctx: cst.SortCommandContext): ast.ESQLCommand<'sort'> {
    const command = this.createCommand('sort', ctx);

    command.args.push(...this.fromOrderExpressions(ctx.orderExpression_list()));

    return command;
  }

  private fromOrderExpressions(
    ctx: cst.OrderExpressionContext[]
  ): Array<ast.ESQLOrderExpression | ast.ESQLAstItem> {
    const expressions: Array<ast.ESQLOrderExpression | ast.ESQLAstItem> = [];

    for (const orderCtx of ctx) {
      expressions.push(this.fromOrderExpression(orderCtx));
    }

    return expressions;
  }

  private fromOrderExpression(
    ctx: cst.OrderExpressionContext
  ): ast.ESQLOrderExpression | ast.ESQLAstItem {
    const arg = this.fromBooleanExpressionToExpressionOrUnknown(ctx.booleanExpression());

    let order: ast.ESQLOrderExpression['order'] = '';
    let nulls: ast.ESQLOrderExpression['nulls'] = '';

    const ordering = ctx._ordering?.text?.toUpperCase();

    if (ordering) order = ordering as ast.ESQLOrderExpression['order'];

    const nullOrdering = ctx._nullOrdering?.text?.toUpperCase();

    switch (nullOrdering) {
      case 'LAST':
        nulls = 'NULLS LAST';
        break;
      case 'FIRST':
        nulls = 'NULLS FIRST';
        break;
    }

    if (!order && !nulls) {
      return arg;
    }

    return Builder.expression.order(
      arg as ast.ESQLColumn,
      { order, nulls },
      this.getParserFields(ctx)
    );
  }

  // --------------------------------------------------------------------- DROP

  private fromDropCommand(ctx: cst.DropCommandContext): ast.ESQLCommand<'drop'> {
    const args = this.fromQualifiedNamePatterns(ctx.qualifiedNamePatterns());
    const command = this.createCommand('drop', ctx, { args });

    return command;
  }

  // ------------------------------------------------------------------- RENAME

  private fromRenameCommand(ctx: cst.RenameCommandContext): ast.ESQLCommand<'rename'> {
    const command = this.createCommand('rename', ctx);
    const renameArgs = this.fromRenameClauses(ctx.renameClause_list());

    command.args.push(...renameArgs);

    return command;
  }

  private fromRenameClauses(clausesCtx: cst.RenameClauseContext[]): ast.ESQLAstItem[] {
    return clausesCtx
      .map((clause) => {
        const asToken = clause.getToken(cst.default.AS, 0);
        const assignToken = clause.getToken(cst.default.ASSIGN, 0);

        const renameToken = asToken || assignToken;

        if (renameToken && textExistsAndIsValid(renameToken.getText())) {
          const renameFunction = this.toFunction(
            renameToken.getText().toLowerCase(),
            clause,
            undefined,
            'binary-expression'
          );

          const renameArgsInOrder = asToken
            ? [clause._oldName, clause._newName]
            : [clause._newName, clause._oldName];

          for (const arg of renameArgsInOrder) {
            if (textExistsAndIsValid(arg.getText())) {
              renameFunction.args.push(this.toColumn(arg));
            }
          }
          const firstArg = firstItem(renameFunction.args);
          const lastArg = lastItem(renameFunction.args);
          const location = renameFunction.location;
          if (firstArg) location.min = firstArg.location.min;
          if (lastArg) location.max = lastArg.location.max;
          return renameFunction;
        }

        if (textExistsAndIsValid(clause._oldName?.getText())) {
          return this.toColumn(clause._oldName);
        }
      })
      .filter(nonNullable);
  }

  // ------------------------------------------------------------------ DISSECT

  private fromDissectCommand(ctx: cst.DissectCommandContext): ast.ESQLCommand<'dissect'> {
    const command = this.createCommand('dissect', ctx);
    const primaryExpression = this.fromPrimaryExpressionStrict(ctx.primaryExpression());
    const stringContext = ctx.string_();
    const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
    const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

    command.args.push(primaryExpression);

    if (doParseStringAndOptions) {
      const stringNode = this.toStringLiteral(stringContext);

      command.args.push(stringNode);
      command.args.push(...this.fromDissectCommandOptions(ctx.dissectCommandOptions()));
    }

    return command;
  }

  private fromDissectCommandOptions(
    ctx: cst.DissectCommandOptionsContext | undefined
  ): ast.ESQLCommandOption[] {
    if (!ctx) {
      return [];
    }

    const options: ast.ESQLCommandOption[] = [];

    for (const optionCtx of ctx.dissectCommandOption_list()) {
      const option = this.toOption(optionCtx.identifier().getText().toLowerCase(), optionCtx);
      options.push(option);
      // it can throw while accessing constant for incomplete commands, so try catch it
      try {
        const optionValue = this.fromConstantToArray(optionCtx.constant());
        if (optionValue != null) {
          option.args.push(optionValue);
        }
      } catch (e) {
        // do nothing here
      }
    }

    return options;
  }

  // --------------------------------------------------------------------- GROK

  private fromGrokCommand(ctx: cst.GrokCommandContext): ast.ESQLCommand<'grok'> {
    const command = this.createCommand('grok', ctx);
    const primaryExpression = this.fromPrimaryExpressionStrict(ctx.primaryExpression());

    command.args.push(primaryExpression);

    const stringContexts = ctx.string__list();

    for (let i = 0; i < stringContexts.length; i++) {
      const stringContext = stringContexts[i];
      const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
      const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

      if (doParseStringAndOptions) {
        const stringNode = this.toStringLiteral(stringContext);
        command.args.push(stringNode);
      }
    }

    return command;
  }
  // ------------------------------------------------------------------- ENRICH

  private fromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLCommand<'enrich'> {
    const command = this.createCommand('enrich', ctx);
    const policy = this.toPolicyNameFromEnrichCommand(ctx);

    command.args.push(policy);

    if (policy.incomplete) {
      command.incomplete = true;
    }

    const onOption = this.toOnOptionFromEnrichCommand(ctx);

    if (onOption) {
      command.args.push(onOption);
    }

    const withOption = this.toWithOptionFromEnrichCommand(ctx);

    if (withOption) {
      command.args.push(withOption);
    }

    return command;
  }

  private toPolicyNameFromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLSource {
    const policyNameCtx = ctx._policyName;
    const policyName = policyNameCtx?.ENRICH_POLICY_NAME() || policyNameCtx?.QUOTED_STRING();

    if (!policyName || !textExistsAndIsValid(policyName.getText())) {
      const source = Builder.expression.source.node(
        {
          sourceType: 'policy',
          name: '',
          index: '',
          prefix: '',
        },
        {
          incomplete: true,
          text: '',
          location: { min: policyNameCtx.start.start, max: policyNameCtx.start.stop },
        }
      );
      return source;
    }

    const name = policyName.getText();
    const colonIndex = name.indexOf(':');
    const withPrefix = colonIndex !== -1;
    const incomplete = false;

    let index: ast.ESQLStringLiteral | undefined;
    let prefix: ast.ESQLStringLiteral | undefined;

    if (withPrefix) {
      const prefixName = name.substring(0, colonIndex);
      const indexName = name.substring(colonIndex + 1);

      prefix = Builder.expression.literal.string(
        prefixName,
        {
          unquoted: true,
        },
        {
          text: prefixName,
          incomplete: false,
          location: {
            min: policyNameCtx.start.start,
            max: policyNameCtx.start.start + prefixName.length - 1,
          },
        }
      );
      index = Builder.expression.literal.string(
        indexName,
        {
          unquoted: true,
        },
        {
          text: indexName,
          incomplete: false,
          location: {
            min: policyNameCtx.start.start + prefixName.length + 1,
            max: policyNameCtx.start.stop,
          },
        }
      );
    } else {
      index = Builder.expression.literal.string(
        name,
        {
          unquoted: true,
        },
        {
          text: name,
          incomplete: false,
          location: { min: policyNameCtx.start.start, max: policyNameCtx.start.stop },
        }
      );
    }

    const source = Builder.expression.source.node(
      {
        sourceType: 'policy',
        name,
        index,
        prefix,
      },
      {
        incomplete,
        text: name,
        location: {
          min: policyNameCtx.start.start,
          max: policyNameCtx.start.stop,
        },
      }
    );

    return source;
  }

  private toOnOptionFromEnrichCommand(
    ctx: cst.EnrichCommandContext
  ): ast.ESQLCommandOption | undefined {
    if (!ctx._matchField) {
      return undefined;
    }

    const identifier = ctx.qualifiedNamePattern();

    if (identifier) {
      const fn = this.toOption(ctx.ON()!.getText().toLowerCase(), ctx);
      let max: number = ctx.ON()!.symbol.stop;

      if (textExistsAndIsValid(identifier.getText())) {
        const column = this.toColumn(identifier);
        fn.args.push(column);
        max = column.location.max;
      }
      fn.location.min = ctx.ON()!.symbol.start;
      fn.location.max = max;

      return fn;
    }

    return undefined;
  }

  private toWithOptionFromEnrichCommand(
    ctx: cst.EnrichCommandContext
  ): ast.ESQLCommandOption | undefined {
    const withCtx = ctx.WITH();

    if (withCtx) {
      const option = this.toOption(withCtx.getText().toLowerCase(), ctx);
      const clauses = ctx.enrichWithClause_list();

      for (const clause of clauses) {
        if (clause._enrichField) {
          const args: ast.ESQLColumn[] = [];

          if (clause.ASSIGN()) {
            args.push(this.toColumn(clause._newName));
            if (textExistsAndIsValid(clause._enrichField?.getText())) {
              args.push(this.toColumn(clause._enrichField));
            }
          } else {
            // if an explicit assign is not set, create a fake assign with
            // both left and right value with the same column
            if (textExistsAndIsValid(clause._enrichField?.getText())) {
              args.push(this.toColumn(clause._enrichField), this.toColumn(clause._enrichField));
            }
          }
          if (args.length) {
            const fn = this.toFunction('=', clause, undefined, 'binary-expression');
            fn.args.push(args[0], args[1] ? [args[1]] : []);
            option.args.push(fn);
          }
        }

        const location = option.location;
        const lastArg = lastItem(option.args);

        location.min = withCtx.symbol.start;
        location.max = lastArg?.location?.max ?? withCtx.symbol.stop;
      }

      return option;
    }

    return undefined;
  }

  // ---------------------------------------------------------------- MV_EXPAND

  private fromMvExpandCommand(ctx: cst.MvExpandCommandContext): ast.ESQLCommand<'mv_expand'> {
    const command = this.createCommand('mv_expand', ctx);
    const identifiers = this.toColumnsFromCommand(ctx);

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
    const onOption = this.toOption('on', joinCondition);
    const joinPredicates: ast.ESQLAstItem[] = onOption.args;

    for (const joinPredicateCtx of joinCondition.booleanExpression_list()) {
      const expression = this.fromBooleanExpressionToExpressionOrUnknown(joinPredicateCtx);

      if (expression) {
        joinPredicates.push(expression);

        if (resolveItem(expression).incomplete) {
          onOption.incomplete = true;
        }
      }
    }

    command.args.push(joinTarget);

    if (onOption.args.length) {
      command.args.push(onOption);

      if (onOption.incomplete) {
        command.incomplete = true;
      }
    }

    return command;
  }

  private fromJoinTarget(
    ctx: cst.JoinTargetContext
  ): ast.ESQLSource | ast.ESQLBinaryExpression<'as'> {
    if (ctx._index) {
      const source = this.toSource(ctx._index);

      if (ctx._qualifier) {
        const alias = Builder.identifier(
          { name: ctx._qualifier.text },
          this.createParserFieldsFromToken(ctx._qualifier)
        );

        return Builder.expression.func.binary('as', [source, alias], undefined, {
          location: getPosition(ctx.start, ctx.stop),
          text: ctx.getText(),
          incomplete: Boolean(ctx.exception),
        });
      }

      return source;
    } else {
      return Builder.expression.source.node(
        {
          sourceType: 'index',
          name: '',
        },
        {
          location: getPosition(ctx.start, ctx.stop),
          incomplete: true,
          text: ctx?.getText(),
        }
      );
    }
  }

  // ------------------------------------------------------------- CHANGE_POINT

  private fromChangePointCommand = (
    ctx: cst.ChangePointCommandContext
  ): ast.ESQLAstChangePointCommand => {
    const value = this.toColumn(ctx._value);
    const command = this.createCommand<'change_point', ast.ESQLAstChangePointCommand>(
      'change_point',
      ctx,
      {
        value,
      }
    );

    command.args.push(value);

    if (ctx._key && ctx._key.getText()) {
      const key = this.toColumn(ctx._key);
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
      const type = this.toColumn(ctx._targetType);
      const pvalue = this.toColumn(ctx._targetPvalue);
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
      const targetField = this.toColumn(ctx._targetField);

      const prompt = this.fromPrimaryExpressionStrict(ctx._prompt) as ast.ESQLSingleAstItem;
      command.prompt = prompt;

      const assignment = this.toFunction(
        ctx.ASSIGN().getText(),
        ctx,
        undefined,
        'binary-expression'
      );
      assignment.args.push(targetField, prompt);
      // update the location of the assign based on arguments
      assignment.location = this.extendLocationToArgs(assignment);

      command.targetField = targetField;
      command.args.push(assignment);
    } else if (ctx._prompt) {
      const prompt = this.fromPrimaryExpressionStrict(ctx._prompt);

      command.prompt = prompt;
      command.args.push(prompt);
    } else {
      // When the user is typing a column as prompt i.e: | COMPLETION message^,
      // ANTLR does not know if it is trying to type a prompt
      // or a target field, so it does not return neither _prompt nor _targetField. We fill the AST
      // with an unknown item until the user inserts the next keyword and breaks the tie.
      const unknownItem = this.fromParserRuleToUnknown(ctx);
      unknownItem.text = ctx.getText().replace(/^completion/i, '');

      command.prompt = unknownItem;
      command.args.push(unknownItem);
    }

    let inferenceId = Builder.expression.literal.string(
      '',
      { name: 'inferenceId' },
      { incomplete: true }
    );

    const commandNamedParametersContext = ctx.commandNamedParameters();
    if (commandNamedParametersContext) {
      const namedParametersOption = this.fromCommandNamedParameters(commandNamedParametersContext);

      const namedParameters = namedParametersOption.args[0] as ast.ESQLMap | undefined;

      const inferenceIdParam = namedParameters?.entries.find(
        (param) => isStringLiteral(param.key) && param.key.valueUnquoted === 'inference_id'
      )?.value as ast.ESQLStringLiteral;

      if (inferenceIdParam) {
        inferenceId = inferenceIdParam;
        inferenceId.incomplete = inferenceIdParam.valueUnquoted?.length === 0;
      }

      command.args.push(namedParametersOption);
    }

    command.inferenceId = inferenceId;
    return command;
  }

  // ------------------------------------------------------------------- SAMPLE

  private fromSampleCommand(ctx: cst.SampleCommandContext): ast.ESQLCommand<'sample'> {
    const command = this.createCommand('sample', ctx);

    if (ctx.constant()) {
      const probability = this.fromConstantToArray(ctx.constant());
      if (probability != null) {
        command.args.push(probability);
      }
    }

    return command;
  }

  // ------------------------------------------------------------- INLINE STATS

  private fromInlinestatsCommand(
    ctx: cst.InlineStatsCommandContext
  ): ast.ESQLCommand<'inline stats'> {
    return this.fromStatsLikeCommand('inline stats', ctx);
  }

  // ------------------------------------------------------------------- RERANK

  /**
   * Supports two syntax forms:
   * - RERANK "query" ON fields WITH {options}
   * - RERANK target = "query" ON fields WITH {options}
   */
  private fromRerankCommand(ctx: cst.RerankCommandContext): ast.ESQLAstRerankCommand {
    const command = this.createCommand<'rerank', ast.ESQLAstRerankCommand>('rerank', ctx);

    this.parseRerankQuery(ctx, command);
    this.parseRerankOnOption(ctx, command);
    this.parseRerankWithOption(ctx, command);

    return command;
  }

  /**
   * Parses the query text and optional target field assignment.
   * Handles: RERANK [target =] "query" ...
   */
  private parseRerankQuery(ctx: cst.RerankCommandContext, command: ast.ESQLAstRerankCommand): void {
    if (!ctx._queryText) {
      return;
    }

    const queryText = this.fromConstantToArray(ctx._queryText);
    if (!queryText) {
      return;
    }

    command.query = queryText as ast.ESQLLiteral;

    // Handle target field assignment: RERANK target = "query"
    if (ctx._targetField && ctx.ASSIGN()) {
      const targetField = this.toColumn(ctx._targetField);
      const assignment = this.toFunction(
        ctx.ASSIGN().getText(),
        ctx,
        undefined,
        'binary-expression'
      ) as ast.ESQLBinaryExpression;

      assignment.args.push(targetField, queryText);
      assignment.location = this.extendLocationToArgs(assignment);

      command.targetField = targetField;
      command.args.push(assignment);
    } else {
      command.args.push(queryText);
    }
  }

  /**
   * Parses the ON fields list.
   * Handles: ... ON field1, field2 = X(field2, 2)
   */
  private parseRerankOnOption(
    ctx: cst.RerankCommandContext,
    command: ast.ESQLAstRerankCommand
  ): void {
    const onToken = ctx.ON();
    const fieldsCtx = ctx.fields();

    if (!onToken || !fieldsCtx) {
      return;
    }

    const onOption = this.toOption(onToken.getText().toLowerCase(), fieldsCtx);
    const fields = this.fromFields(fieldsCtx);

    onOption.args.push(...fields);
    onOption.location.min = onToken.symbol.start;

    const lastArg = lastItem(onOption.args);
    if (lastArg) {
      onOption.location.max = lastArg.location.max;
    }

    command.args.push(onOption);
    command.fields = fields;
  }

  /**
   * Parses WITH parameters as a generic map.
   * Handles: ... WITH {inference_id: "model", scoreColumn: "score", ...}
   */
  private parseRerankWithOption(
    ctx: cst.RerankCommandContext,
    command: ast.ESQLAstRerankCommand
  ): void {
    const namedParamsCtx = ctx.commandNamedParameters();

    if (!namedParamsCtx) {
      return;
    }

    const withOption = this.fromCommandNamedParameters(namedParamsCtx);

    if (!withOption) {
      return;
    }

    // check the existence of inference_id
    const namedParameters = withOption.args[0] as ast.ESQLMap | undefined;
    command.inferenceId = undefined;

    if (namedParameters) {
      command.args.push(withOption);

      command.inferenceId = Builder.expression.literal.string(
        '',
        { name: 'inferenceId' },
        { incomplete: true }
      );

      const inferenceIdParam = namedParameters?.entries.find(
        (param) =>
          param.key.type === 'literal' &&
          param.key.literalType === 'keyword' &&
          param.key.valueUnquoted === 'inference_id'
      )?.value as ast.ESQLStringLiteral;

      if (inferenceIdParam) {
        command.inferenceId = inferenceIdParam;
        command.inferenceId.incomplete = inferenceIdParam.valueUnquoted?.length === 0;
      }
    }
  }

  // --------------------------------------------------------------------- FUSE

  private fromFuseCommand(ctx: cst.FuseCommandContext): ast.ESQLAstFuseCommand {
    const fuseTypeCtx = ctx.identifier();

    const args: ast.ESQLAstItem[] = [];
    let incomplete = false;

    const fuseType = fuseTypeCtx ? this.fromIdentifier(fuseTypeCtx) : undefined;

    // FUSE <fuse_method>
    if (fuseType) {
      args.push(fuseType);
    }

    // FUSE SCORE BY <score_column> GROUP BY <group_column> KEY BY <key_columns> WITH <options>
    for (const config of ctx.fuseConfiguration_list()) {
      const configurationItemCommandOption = this.fromFuseConfigurationItem(config);
      if (configurationItemCommandOption) {
        args.push(configurationItemCommandOption);
      }
      incomplete ||= configurationItemCommandOption?.incomplete ?? true;
    }

    const fuseCommand = this.createCommand<'fuse', ast.ESQLAstFuseCommand>('fuse', ctx, {
      args,
      incomplete,
    });

    if (fuseType) {
      fuseCommand.fuseType = fuseType;
    }

    return fuseCommand;
  }

  private fromFuseConfigurationItem(
    configCtx: cst.FuseConfigurationContext
  ): ast.ESQLCommandOption | null {
    const byContext = configCtx.BY();

    // SCORE BY <score_column>
    const scoreCtx = configCtx.SCORE();
    if (scoreCtx && byContext) {
      const args: ast.ESQLAstItem[] = [];

      const scoreColumnCtx = configCtx.qualifiedName();
      if (textExistsAndIsValid(scoreColumnCtx.getText())) {
        args.push(this.toColumn(scoreColumnCtx));
      }

      const incomplete = args.length === 0;
      return this.toOption('score by', configCtx, args, incomplete);
    }

    // KEY BY <key_columns>
    const keyCtx = configCtx.KEY();
    if (keyCtx && byContext) {
      const args = this.fromFuseKeyByFields(configCtx.fuseKeyByFields());
      const incomplete = args.length === 0 || args.some((arg) => arg.incomplete);
      return this.toOption('key by', configCtx, args, incomplete);
    }

    // GROUP BY <group_column>
    const groupCtx = configCtx.GROUP();
    if (groupCtx && byContext) {
      const args: ast.ESQLAstItem[] = [];
      const groupColumnCtx = configCtx.qualifiedName();

      if (textExistsAndIsValid(groupColumnCtx.getText())) {
        args.push(this.toColumn(groupColumnCtx));
      }

      const incomplete = args.length === 0;
      return this.toOption('group by', configCtx, args, incomplete);
    }

    // WITH <map_expression>
    const withCtx = configCtx.WITH();
    if (withCtx) {
      const args: ast.ESQLAstItem[] = [];
      const mapExpressionCtx = configCtx.mapExpression();

      const map = this.fromMapExpression(mapExpressionCtx);
      if (map && textExistsAndIsValid(map.text)) {
        args.push(map);
      }

      const incomplete =
        args.length === 0 || map.incomplete || !textExistsAndIsValid(configCtx.getText());
      return this.toOption('with', configCtx, args, incomplete);
    }

    return null;
  }

  // ------------------------------------------------------------------- PROMQL

  /**
   * Expanded all forms of the PROMQL command:
   *
   * ```
   * PROMQL query
   * PROMQL ( query )
   * PROMQL name = ( query )
   * PROMQL key1=value1 key2=value2... query
   * PROMQL key1=value1 key2=value2... ( query )
   * PROMQL key1=value1 key2=value2... name = ( query )
   * ```
   */
  private fromPromqlCommand(ctx: cst.PromqlCommandContext): ast.ESQLAstPromqlCommand {
    const command = this.createCommand('promql', ctx) as ast.ESQLAstPromqlCommand;
    const args: ast.ESQLAstExpression[] = command.args;
    const paramCtxs = ctx.promqlParam_list();

    // PromQL params: (key = value) pairs
    if (paramCtxs.length > 0) {
      const params = this.fromPromqlParamsToMap(paramCtxs);
      command.params = params;
      args.push(params);
      command.incomplete ||= params.incomplete;
    }

    const query = this.toPromqlCommandQuery(ctx);

    // PromQL query
    if (query) {
      command.query = query;
      args.push(query);
    } else {
      command.incomplete = true;
    }

    return command;
  }

  /**
   * Converts promql params to a map with "assignment" representation.
   */
  private fromPromqlParamsToMap(paramCtxs: cst.PromqlParamContext[]): ast.ESQLMap {
    const entries: ast.ESQLMapEntry[] = [];

    for (const paramCtx of paramCtxs) {
      const entry = this.fromPromqlParam(paramCtx);

      if (entry) {
        entries.push(entry);
      }
    }

    const firstParam = paramCtxs[0];
    const lastParam = paramCtxs[paramCtxs.length - 1];
    const node = Builder.expression.map(
      { entries, representation: 'assignment' },
      {
        location: getPosition(firstParam.start, lastParam.stop),
        incomplete: entries.some((e) => e.incomplete) || !entries.length,
      }
    );

    return node;
  }

  /**
   * Converts a single promql param (key=value) to a map entry.
   */
  private fromPromqlParam(ctx: cst.PromqlParamContext): ast.ESQLMapEntry | undefined {
    const nameCtx = ctx._name;
    const valueCtx = ctx._value;

    if (!nameCtx) {
      return undefined;
    }

    const key = this.fromPromqlParamName(nameCtx);
    if (!key) {
      return undefined;
    }

    const value = valueCtx
      ? this.fromPromqlParamValue(valueCtx)
      : Builder.identifier({ name: '' }, { incomplete: true });

    if (!value) {
      return undefined;
    }

    const entry = Builder.expression.entry(key, value, {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception) || key.incomplete || value.incomplete,
    });

    return entry;
  }

  /**
   * Converts a promql param name to an AST node.
   * Grammar: UNQUOTED_IDENTIFIER | QUOTED_IDENTIFIER | QUOTED_STRING | NAMED_OR_POSITIONAL_PARAM
   */
  private fromPromqlParamName(
    ctx: cst.PromqlParamNameContext
  ): (ast.ESQLAstExpression & { incomplete: boolean }) | undefined {
    const parserFields = this.getParserFields(ctx);

    const unquotedId = ctx.UNQUOTED_IDENTIFIER();
    if (unquotedId) {
      return Builder.identifier({ name: unquotedId.getText() }, parserFields);
    }

    const quotedId = ctx.QUOTED_IDENTIFIER();
    if (quotedId) {
      const text = quotedId.getText();
      const name = text.slice(1, -1).replace(/``/g, '`');
      return Builder.identifier({ name }, parserFields);
    }

    const quotedString = ctx.QUOTED_STRING();
    if (quotedString) {
      const text = quotedString.getText();
      let valueUnquoted: string;
      if (text.startsWith('"""') && text.endsWith('"""')) {
        valueUnquoted = text.slice(3, -3);
      } else {
        valueUnquoted = text.slice(1, -1).replace(/\\"/g, '"');
      }
      return Builder.expression.literal.string(valueUnquoted, { name: text }, parserFields);
    }

    const namedParam = ctx.NAMED_OR_POSITIONAL_PARAM();
    if (namedParam) {
      const text = namedParam.getText();
      const paramValue = text.slice(1); // Remove the leading '?'
      const valueAsNumber = Number(paramValue);
      const isPositional = String(valueAsNumber) === paramValue;

      if (isPositional) {
        return Builder.param.positional({ value: valueAsNumber }, parserFields);
      } else {
        return Builder.param.named({ value: paramValue }, parserFields);
      }
    }

    return undefined;
  }

  /**
   * Converts a promql param value to an AST node.
   * Grammar: promqlIndexPattern (COMMA promqlIndexPattern)* | QUOTED_IDENTIFIER | NAMED_OR_POSITIONAL_PARAM
   */
  private fromPromqlParamValue(
    ctx: cst.PromqlParamValueContext
  ): ast.ESQLAstExpression | undefined {
    const parserFields = this.getParserFields(ctx);

    const indexPatterns = ctx.promqlIndexPattern_list();

    if (indexPatterns.length > 0) {
      return this.fromPromqlIndexPatternList(indexPatterns);
    }

    const quotedId = ctx.QUOTED_IDENTIFIER();

    if (quotedId) {
      const text = quotedId.getText();
      const name = text.slice(1, -1).replace(/``/g, '`');
      return Builder.identifier({ name }, parserFields);
    }

    const namedParam = ctx.NAMED_OR_POSITIONAL_PARAM();

    if (namedParam) {
      const text = namedParam.getText();
      const paramValue = text.slice(1); // Remove the leading '?'
      const valueAsNumber = Number(paramValue);
      const isPositional = String(valueAsNumber) === paramValue;

      if (isPositional) {
        return Builder.param.positional({ value: valueAsNumber }, parserFields);
      } else {
        return Builder.param.named({ value: paramValue }, parserFields);
      }
    }

    return undefined;
  }

  private fromPromqlIndexPatternList(ctx: cst.PromqlIndexPatternContext[]): ast.ESQLList {
    const length = ctx.length;
    const values: ast.ESQLAstExpression[] = [];
    let incomplete = false;

    for (let i = 0; i < length; i++) {
      const indexPatternCtx = ctx[i];
      const item = this.fromPromqlIndexPattern(indexPatternCtx);

      incomplete ||= Boolean(indexPatternCtx.exception) || item.incomplete;
      values.push(item);
    }

    const location: ast.ESQLLocation = {
      min: values[0]?.location.min ?? 0,
      max: values[values.length - 1]?.location.max ?? 0,
    };
    const list = Builder.expression.list.bare(
      { values },
      {
        incomplete,
        location,
      }
    );

    return list;
  }

  private fromPromqlIndexPattern(ctx: cst.PromqlIndexPatternContext): ast.ESQLSource {
    const text = ctx.getText();
    let prefix: ast.ESQLStringLiteral | undefined;
    let index: ast.ESQLStringLiteral | undefined;
    let selector: ast.ESQLStringLiteral | undefined;

    const indexStringCtx = ctx.promqlIndexString();

    if (indexStringCtx) {
      index = this.fromPromqlIndexString(indexStringCtx);
    }

    const clusterStringCtx = ctx.promqlClusterString();

    if (clusterStringCtx) {
      prefix = this.fromUnquotedStringContext(clusterStringCtx);
    }

    const unquotedIndexStringCtx = ctx.promqlUnquotedIndexString();

    if (unquotedIndexStringCtx) {
      index = this.fromUnquotedStringContext(unquotedIndexStringCtx);
    }

    const selectorString = ctx.promqlSelectorString();

    if (selectorString) {
      selector = this.fromUnquotedStringContext(selectorString);
    }

    const source = Builder.expression.source.node(
      {
        sourceType: 'index',
        prefix,
        index,
        selector,
        name: text,
      },
      {
        location: getPosition(ctx.start, ctx.stop),
        incomplete: Boolean(ctx.exception || text === ''),
        text: ctx?.getText(),
      }
    );

    return source;
  }

  private fromPromqlIndexString(ctx: cst.PromqlIndexStringContext): ast.ESQLStringLiteral {
    const unquotedIdentifierCtx = ctx.UNQUOTED_IDENTIFIER();

    if (unquotedIdentifierCtx) {
      return this.toUnquotedString(unquotedIdentifierCtx);
    }

    const unquotedSourceCtx = ctx.UNQUOTED_SOURCE();

    if (unquotedSourceCtx) {
      return this.toUnquotedString(unquotedSourceCtx);
    }

    const quotedStringCtx = ctx.QUOTED_STRING();

    if (quotedStringCtx) {
      return this.toStringLiteral(ctx);
    }

    return Builder.expression.literal.string('', { name: '' }, { incomplete: true });
  }

  private fromUnquotedStringContext(
    ctx: Pick<cst.PromqlClusterStringContext, 'UNQUOTED_IDENTIFIER' | 'UNQUOTED_SOURCE'>
  ): ast.ESQLStringLiteral {
    const unquotedIdentifierCtx = ctx.UNQUOTED_IDENTIFIER();

    if (unquotedIdentifierCtx) {
      return this.toUnquotedString(unquotedIdentifierCtx);
    }

    const unquotedSourceCtx = ctx.UNQUOTED_SOURCE();

    if (unquotedSourceCtx) {
      return this.toUnquotedString(unquotedSourceCtx);
    }

    return Builder.expression.literal.string('', { name: '' }, { incomplete: true });
  }

  private toPromqlCommandQuery(
    ctx: cst.PromqlCommandContext
  ): ast.ESQLAstPromqlCommandQuery | undefined {
    const queryPartCtxs = ctx.promqlQueryPart_list();
    const lp = ctx.LP();
    const rp = ctx.RP();
    const valueNameCtx = ctx.valueName();
    let node: ast.ESQLAstPromqlCommandQuery | undefined = this.fromPromqlQueryParts(queryPartCtxs);

    if (!node) {
      return undefined;
    }

    // No parenthesis
    if (!lp) {
      return node;
    }

    const closeParenText = rp?.getText() ?? '';
    const hasCloseParen = rp && !/<missing /.test(closeParenText);
    const parensLocation = getPosition(lp.symbol, hasCloseParen ? rp.symbol : ctx.stop);

    node = Builder.expression.parens(node, {
      location: parensLocation,
      incomplete: !hasCloseParen || node.incomplete,
    });

    // There's a "name = ( query )" assignment
    if (valueNameCtx) {
      const valueNameId = this.fromIdentifier(valueNameCtx);
      node = Builder.expression.func.binary(
        '=',
        [valueNameId, node],
        {},
        {
          location: getPosition(valueNameCtx.start, hasCloseParen ? rp.symbol : ctx.stop),
          incomplete: node.incomplete,
        }
      );
    }

    return node;
  }

  /**
   * Parses promql query parts into a PromQL AST node.
   */
  private fromPromqlQueryParts(
    queryPartCtxs: cst.PromqlQueryPartContext[]
  ): PromQLAstQueryExpression | undefined {
    if (queryPartCtxs.length === 0) {
      return undefined;
    }

    const firstPart = queryPartCtxs[0];
    const lastPart = queryPartCtxs[queryPartCtxs.length - 1];
    const location = getPosition(firstPart.start, lastPart.stop);
    const text = this.parser.src.slice(location.min, location.max + 1);
    const trimmedText = text.trim();
    const isEmpty = !trimmedText || trimmedText === '()';

    if (isEmpty) {
      return undefined;
    }

    const parsed = PromQLParser.parse(text, { offset: location.min });

    return parsed.root;
  }

  // --------------------------------------------------------------------- FORK

  private fromForkCommand(ctx: cst.ForkCommandContext): ast.ESQLCommand<'fork'> {
    const subQueriesCtx = ctx.forkSubQueries();
    const subQueryCtxs = subQueriesCtx.forkSubQuery_list();
    const args = subQueryCtxs.map((subQueryCtx) => this.fromForkSubQuery(subQueryCtx));
    const command = this.createCommand<'fork'>('fork', ctx, { args });

    return command;
  }

  private fromForkSubQuery(ctx: cst.ForkSubQueryContext): ast.ESQLParens {
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

    const openParen = ctx.LP();
    const closeParen = ctx.RP();

    const closeParenText = closeParen?.getText() ?? '';
    const hasCloseParen = closeParen && !/<missing /.test(closeParenText);
    const incomplete = Boolean(ctx.exception) || !hasCloseParen;

    const query = Builder.expression.query(commands, {
      ...this.getParserFields(ctx),
      incomplete,
    });

    return Builder.expression.parens(query, {
      incomplete: incomplete || query.incomplete,
      location: getPosition(
        openParen?.symbol ?? ctx.start,
        hasCloseParen ? closeParen.symbol : ctx.stop
      ),
    });
  }

  // --------------------------------------------------------------------- MMR

  private fromMmrCommand(ctx: cst.MmrCommandContext): ast.ESQLCommand<'mmr'> {
    const args: ast.ESQLAstItem[] = [];

    const queryVector = this.fromMmrQueryVectorParam(ctx.mmrQueryVectorParams());
    if (queryVector) args.push(queryVector);

    const onOption = this.fromMmrOnOption(ctx);
    args.push(onOption);
    const diversifyField = onOption.args[0]
      ? (onOption.args[0] as ast.ESQLColumn).args[0]
      : undefined;

    const limitOption = this.fromMmrLimitOption(ctx);
    args.push(limitOption);
    const limit = limitOption.args[0] as ast.ESQLLiteral;

    const withOption = this.fromMmrWithOption(ctx.commandNamedParameters());
    if (withOption) args.push(withOption);
    const namedParameters = withOption ? (withOption.args[0] as ast.ESQLMap) : undefined;

    const command = this.createCommand<'mmr', ast.ESQLAstMmrCommand>('mmr', ctx, {
      args,
      queryVector,
      diversifyField,
      limit,
      namedParameters,
    });
    command.incomplete ||= limitOption.incomplete;
    command.incomplete ||= withOption?.incomplete ?? false;

    return command;
  }

  private fromMmrQueryVectorParam(
    queryVectorContext: cst.MmrQueryVectorParamsContext
  ): ast.ESQLAstExpression | ast.ESQLParam | undefined {
    if (!queryVectorContext || queryVectorContext.children === null) {
      return;
    }

    const childContext = queryVectorContext.children[0];
    let queryVector: ast.ESQLAstExpression | ast.ESQLParam | undefined;

    if (childContext instanceof cst.PrimaryExpressionContext) {
      queryVector = this.fromPrimaryExpression(childContext);
    } else if (childContext instanceof cst.ParameterContext) {
      queryVector = this.fromParameter(childContext);
    }

    return queryVector;
  }

  private fromMmrOnOption(ctx: cst.MmrCommandContext): ast.ESQLCommandOption {
    const onToken = ctx.ON();
    const diversifyFieldCtx = ctx.qualifiedName();

    const diversifyField = this.toColumn(diversifyFieldCtx);
    const onOption = this.toOption(onToken.getText().toLowerCase(), diversifyFieldCtx);

    onOption.args.push(diversifyField);
    onOption.location.min = onToken.symbol.start;
    onOption.location.max = diversifyField.location.max;

    return onOption;
  }

  private fromMmrLimitOption(ctx: cst.MmrCommandContext): ast.ESQLCommandOption {
    const limitToken = ctx.MMR_LIMIT();
    const limitValueCtx = ctx.integerValue();

    const limitOption = this.toOption(limitToken.getText().toLowerCase(), limitValueCtx);

    limitOption.args.push(this.fromConstantToArray(limitValueCtx));
    limitOption.location.min = limitToken.symbol.start;
    limitOption.location.max = limitValueCtx.stop?.stop ?? limitToken.symbol.stop;

    return limitOption;
  }

  private fromMmrWithOption(
    namedParametersCtx: cst.CommandNamedParametersContext
  ): ast.ESQLCommandOption | undefined {
    const withOption = this.fromCommandNamedParameters(namedParametersCtx);

    const mapArg = withOption.args[0] as ast.ESQLMap | undefined;

    if (mapArg) {
      const incomplete =
        mapArg.entries.some((entry) => entry.incomplete) || mapArg.entries.length === 0;

      mapArg.incomplete = incomplete;
      withOption.incomplete = incomplete;

      return withOption;
    }
  }

  // -------------------------------------------------------------- expressions

  private toColumnsFromCommand(
    ctx:
      | cst.KeepCommandContext
      | cst.DropCommandContext
      | cst.MvExpandCommandContext
      | cst.MetadataContext
  ): ast.ESQLColumn[] {
    if (ctx instanceof cst.MetadataContext) {
      return ctx
        .UNQUOTED_SOURCE_list()
        .map((terminalNode) => this.toColumnFromTerminalNode(terminalNode));
    }

    const identifiers = this.extractIdentifiers(ctx);
    return this.toColumns(identifiers);
  }

  private extractIdentifiers(
    ctx: cst.KeepCommandContext | cst.DropCommandContext | cst.MvExpandCommandContext
  ) {
    if (ctx instanceof cst.MvExpandCommandContext) {
      return this.wrapIdentifierAsArray(ctx.qualifiedName());
    }

    return this.wrapIdentifierAsArray(ctx.qualifiedNamePatterns().qualifiedNamePattern_list());
  }

  private wrapIdentifierAsArray<T extends antlr.ParserRuleContext>(identifierCtx: T | T[]): T[] {
    return Array.isArray(identifierCtx) ? identifierCtx : [identifierCtx];
  }

  /**
   * Converts a terminal node directly to a column AST node.
   * Used for metadata fields where we have terminal nodes instead of parser
   * rule contexts.
   */
  private toColumnFromTerminalNode(node: antlr.TerminalNode): ast.ESQLColumn {
    const text = node.getText();
    const column = Builder.expression.column(
      {
        args: [Builder.identifier({ name: text }, this.createParserFieldsFromToken(node.symbol))],
      },
      undefined,
      {
        text,
        location: getPosition(node.symbol),
        incomplete: false,
      }
    );
    column.name = text;
    column.quoted = false;
    return column;
  }

  private toColumns(identifiers: antlr.ParserRuleContext[]): ast.ESQLColumn[] {
    const args: ast.ESQLColumn[] =
      identifiers
        .filter((child) => textExistsAndIsValid(child.getText()))
        .map((sourceContext) => {
          return this.toColumn(sourceContext);
        }) ?? [];

    return args;
  }

  private getMathOperation(ctx: cst.ArithmeticBinaryContext) {
    return (
      (ctx.PLUS() || ctx.MINUS() || ctx.ASTERISK() || ctx.SLASH() || ctx.PERCENT()).getText() || ''
    );
  }

  /**
   * @todo Make it return a single value, not an array.
   */
  private visitValueExpression(ctx: cst.ValueExpressionContext) {
    if (!textExistsAndIsValid(ctx.getText())) {
      return [];
    }

    if (ctx instanceof cst.ValueExpressionDefaultContext) {
      return this.fromOperatorExpression(ctx.operatorExpression());
    }

    if (ctx instanceof cst.ComparisonContext) {
      const operatorCtx = ctx.comparisonOperator();
      const comparisonOperatorText =
        (
          operatorCtx.EQ() ||
          operatorCtx.NEQ() ||
          operatorCtx.LT() ||
          operatorCtx.LTE() ||
          operatorCtx.GT() ||
          operatorCtx.GTE()
        ).getText() || '';
      const comparisonFn = this.toFunction(
        comparisonOperatorText,
        operatorCtx,
        undefined,
        'binary-expression'
      );
      comparisonFn.args.push(
        this.fromOperatorExpression(ctx._left)!,
        this.fromOperatorExpression(ctx._right)!
      );
      // update the location of the comparisonFn based on arguments
      const argsLocationExtends = this.extendLocationToArgs(comparisonFn);
      comparisonFn.location = argsLocationExtends;

      return comparisonFn;
    }
  }

  private fromOperatorExpression(
    ctx: cst.OperatorExpressionContext
  ): ast.ESQLBinaryExpression | ast.ESQLAstExpression | undefined {
    if (ctx instanceof cst.ArithmeticUnaryContext) {
      const arg = this.fromOperatorExpression(ctx.operatorExpression());
      const fn = this.toFunction('*', ctx, undefined, 'binary-expression');

      fn.args.push(this.createFakeMultiplyLiteral(ctx, 'integer'));

      if (arg) {
        fn.args.push(arg);
      }

      return fn as ast.ESQLBinaryExpression;
    }

    if (ctx instanceof cst.ArithmeticBinaryContext) {
      const fn = this.toFunction(this.getMathOperation(ctx), ctx, undefined, 'binary-expression');
      const args = [
        this.fromOperatorExpression(ctx._left),
        this.fromOperatorExpression(ctx._right),
      ];
      for (const arg of args) {
        if (arg) {
          fn.args.push(arg);
        }
      }
      // update the location of the assign based on arguments
      const argsLocationExtends = this.extendLocationToArgs(fn);

      fn.location = argsLocationExtends;

      return fn as ast.ESQLBinaryExpression;
    }

    if (ctx instanceof cst.OperatorExpressionDefaultContext) {
      return this.fromPrimaryExpression(ctx.primaryExpression());
    }

    return undefined;
  }

  private createFakeMultiplyLiteral(
    ctx: ArithmeticUnaryContext,
    literalType: ast.ESQLNumericLiteralType
  ): ast.ESQLLiteral {
    return {
      type: 'literal',
      literalType,
      text: ctx.getText(),
      name: ctx.getText(),
      value: ctx.PLUS() ? 1 : -1,
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    };
  }

  private getBooleanValue(ctx: cst.BooleanLiteralContext | cst.BooleanValueContext) {
    const parentNode = ctx instanceof cst.BooleanLiteralContext ? ctx.booleanValue() : ctx;
    const booleanTerminalNode = parentNode.TRUE() || parentNode.FALSE();
    return this.toLiteral('boolean', booleanTerminalNode!);
  }

  private fromPrimaryExpression(
    ctx: cst.PrimaryExpressionContext
  ): ast.ESQLAstExpression | undefined {
    if (ctx instanceof cst.DereferenceContext) {
      return this.toColumn(ctx.qualifiedName());
    } else if (ctx instanceof cst.FunctionContext) {
      return this.fromFunction(ctx);
    } else if (ctx instanceof cst.ParenthesizedExpressionContext) {
      return this.fromBooleanExpressionToExpressionOrUnknown(ctx.booleanExpression());
    } else if (ctx instanceof cst.InlineCastContext) {
      return this.collectInlineCast(ctx);
    } else if (ctx instanceof cst.ConstantDefaultContext) {
      return this.fromConstantStrict(ctx.constant());
    }

    return undefined;
  }

  private fromPrimaryExpressionStrict(ctx: cst.PrimaryExpressionContext): ast.ESQLAstExpression {
    return this.fromPrimaryExpression(ctx) ?? this.fromParserRuleToUnknown(ctx);
  }

  private fromCommandNamedParameters(
    ctx: cst.CommandNamedParametersContext
  ): ast.ESQLCommandOption {
    const withOption = this.toOption('with', ctx);

    const withCtx = ctx.WITH();

    if (!withCtx) {
      withOption.incomplete = true;
      return withOption;
    }

    const mapExpressionCtx = ctx.mapExpression();

    if (!mapExpressionCtx) {
      withOption.location.min = withCtx.symbol.start;
      withOption.location.max = withCtx.symbol.stop;
      withOption.incomplete = true;
    }

    const map = this.fromMapExpression(mapExpressionCtx);
    withOption.args.push(map);
    withOption.location.min = withCtx.symbol.start;
    withOption.location.max = map.location.max;
    withOption.incomplete = map.incomplete;

    return withOption;
  }

  private collectInlineCast(ctx: cst.InlineCastContext): ast.ESQLInlineCast {
    const value = this.fromPrimaryExpressionStrict(ctx.primaryExpression());

    return Builder.expression.inlineCast(
      { castType: ctx.dataType().getText().toLowerCase(), value },
      this.getParserFields(ctx)
    );
  }

  private fromBooleanExpressions(
    ctx: cst.BooleanExpressionContext[] | undefined
  ): ast.ESQLAstItem[] {
    const list: ast.ESQLAstItem[] = [];

    if (!ctx) {
      return list;
    }

    for (const expr of ctx) {
      const node = this.fromBooleanExpressionToExpressionOrUnknown(expr);

      if (node) {
        list.push(node);
      }
    }
    return list;
  }

  public fromBooleanExpression(
    ctx: cst.BooleanExpressionContext
  ): ast.ESQLAstExpression | undefined {
    if (!ctx) {
      return undefined;
    }

    if (ctx instanceof cst.MatchExpressionContext) {
      return this.visitMatchExpression(ctx);
    }

    if (ctx instanceof cst.LogicalNotContext) {
      return this.fromLogicalNot(ctx);
    }

    if (ctx instanceof cst.LogicalBinaryContext) {
      return this.fromLogicalBinary(ctx);
    }

    if (ctx instanceof cst.LogicalInContext) {
      return this.fromLogicalIn(ctx);
    }

    if (ctx instanceof cst.RegexExpressionContext) {
      return this.fromRegexExpression(ctx);
    }

    if (ctx instanceof cst.IsNullContext) {
      return this.fromIsNull(ctx);
    }

    if (ctx instanceof cst.BooleanDefaultContext) {
      const node = this.fromBooleanDefault(ctx);

      if (Array.isArray(node)) {
        return resolveItem(node);
      }

      return node;
    }

    return undefined;
  }

  public fromBooleanExpressionToExpressionOrUnknown(
    ctx: cst.BooleanExpressionContext
  ): ast.ESQLAstExpression {
    return this.fromBooleanExpression(ctx) || this.fromParserRuleToUnknown(ctx);
  }

  private fromLogicalNot(ctx: cst.LogicalNotContext): ast.ESQLUnaryExpression {
    const child = this.fromBooleanExpressionToExpressionOrUnknown(ctx.booleanExpression());
    const args = [child];
    const fn = this.toFunction(
      'not',
      ctx,
      undefined,
      'unary-expression',
      args
    ) as ast.ESQLUnaryExpression;

    return fn;
  }

  private fromLogicalBinary(ctx: cst.LogicalBinaryContext) {
    const leftNode = this.fromBooleanExpressionToExpressionOrUnknown(ctx._left);
    const rightNode = this.fromBooleanExpressionToExpressionOrUnknown(ctx._right);
    const args: [ast.ESQLAstExpression, ast.ESQLAstExpression] = [leftNode, rightNode];
    const operator = this.toIdentifierFromTerminalNode(ctx.AND() || ctx.OR());
    const operatorName = ctx.AND() ? 'and' : 'or';
    const fn = this.toBinaryExpression(operatorName, ctx, args, { operator });

    return fn;
  }

  private fromLogicalIn(ctx: cst.LogicalInContext) {
    const [leftCtx, ...rightCtxs] = ctx.valueExpression_list();
    const left = resolveItem(
      this.visitValueExpression(leftCtx) ?? this.fromParserRuleToUnknown(leftCtx)
    ) as ast.ESQLAstExpression;
    const right = this.toTuple(rightCtxs, ctx.LP(), ctx.RP());
    const expression = this.toFunction(
      ctx.NOT() ? 'not in' : 'in',
      ctx,
      { min: ctx.start.start, max: ctx.stop?.stop ?? ctx.RP().symbol.stop },
      'binary-expression',
      [left, right],
      left.incomplete || right.incomplete
    );

    return expression;
  }

  private fromRegexExpression(ctx: cst.RegexExpressionContext): ast.ESQLFunction | undefined {
    return this.fromRegexBooleanExpression(ctx.regexBooleanExpression());
  }

  private fromRegexBooleanExpression(
    ctx: cst.RegexBooleanExpressionContext
  ): ast.ESQLFunction | undefined {
    if (ctx instanceof cst.LikeExpressionContext || ctx instanceof cst.RlikeExpressionContext) {
      return this.toRegexBinaryExpression(ctx);
    }

    if (
      ctx instanceof cst.LikeListExpressionContext ||
      ctx instanceof cst.RlikeListExpressionContext
    ) {
      return this.toRegexListExpression(ctx);
    }

    return undefined;
  }

  private toRegexBinaryExpression(
    ctx: cst.LikeExpressionContext | cst.RlikeExpressionContext
  ): ast.ESQLBinaryExpression | undefined {
    const left = this.visitValueExpression(ctx.valueExpression());

    if (!left) {
      return undefined;
    }

    const right =
      this.fromStringOrParameter(ctx.stringOrParameter()) ??
      this.fromParserRuleToUnknown(ctx.stringOrParameter());
    const notCtx = ctx.NOT();
    const likeType = ctx instanceof cst.RlikeExpressionContext ? 'rlike' : 'like';
    const operator = `${notCtx ? 'not ' : ''}${likeType}` as ast.BinaryExpressionOperator;
    const operatorNode = this.toIdentifierFromTerminalNode(
      ctx instanceof cst.LikeExpressionContext ? ctx.LIKE() : ctx.RLIKE()
    );

    if (notCtx) {
      operatorNode.name = `NOT ${operatorNode.name}`;
      operatorNode.location.min = notCtx.symbol.start;
      operatorNode.text = `not${operatorNode.text}`;
    }

    const args: [ast.ESQLAstExpression, ast.ESQLAstExpression] = [
      left as ast.ESQLAstExpression,
      right,
    ];

    return this.toBinaryExpression(operator, ctx, args, {
      operator: operatorNode,
    });
  }

  private toRegexListExpression(
    ctx: cst.LikeListExpressionContext | cst.RlikeListExpressionContext
  ): ast.ESQLBinaryExpression | undefined {
    const left = this.visitValueExpression(ctx.valueExpression());

    if (!left) {
      return undefined;
    }

    const notCtx = ctx.NOT();
    const likeType = ctx instanceof cst.RlikeListExpressionContext ? 'rlike' : 'like';
    const operator = `${notCtx ? 'not ' : ''}${likeType}` as ast.BinaryExpressionOperator;
    const operatorNode = this.toIdentifierFromTerminalNode(
      ctx instanceof cst.LikeListExpressionContext ? ctx.LIKE() : ctx.RLIKE()
    );

    if (notCtx) {
      operatorNode.name = `NOT ${operatorNode.name}`;
      operatorNode.location.min = notCtx.symbol.start;
      operatorNode.text = `not${operatorNode.text}`;
    }

    // Convert the list of string patterns into a tuple list AST node
    const stringCtxs = ctx.stringOrParameter_list();
    const values: ast.ESQLAstExpression[] = stringCtxs.map(
      (stringCtx) =>
        this.fromStringOrParameter(stringCtx) ?? this.fromParserRuleToUnknown(stringCtx)
    );

    const list = Builder.expression.list.tuple(
      { values },
      {
        incomplete: values.some((v) => v.incomplete),
        location: getPosition(ctx.LP().symbol, ctx.RP().symbol),
      }
    );

    const args: [ast.ESQLAstExpression, ast.ESQLList] = [left as ast.ESQLAstExpression, list];

    return this.toBinaryExpression(operator, ctx, args, {
      operator: operatorNode,
    });
  }

  private fromIsNull(
    ctx: cst.IsNullContext
  ): ast.ESQLUnaryExpression<'is null' | 'is not null'> | undefined {
    const negate = ctx.NOT();
    const fnName = `is${negate ? ' not ' : ' '}null`;
    const fn = this.toFunction(
      fnName,
      ctx,
      undefined,
      'postfix-unary-expression'
    ) as unknown as ast.ESQLUnaryExpression<'is null' | 'is not null'>;
    const arg = this.visitValueExpression(ctx.valueExpression());

    if (arg) {
      fn.args.push(Array.isArray(arg) ? resolveItem(arg) : arg);
    }

    return fn;
  }

  private fromBooleanDefault(ctx: cst.BooleanDefaultContext) {
    return this.visitValueExpression(ctx.valueExpression());
  }

  private visitMatchExpression(ctx: cst.MatchExpressionContext): ESQLAstMatchBooleanExpression {
    return this.visitMatchBooleanExpression(ctx.matchBooleanExpression());
  }

  private visitMatchBooleanExpression(
    ctx: cst.MatchBooleanExpressionContext
  ): ESQLAstMatchBooleanExpression {
    let expression: ESQLAstMatchBooleanExpression = this.toColumn(ctx.qualifiedName());
    const dataTypeCtx = ctx.dataType();
    const constantCtx = ctx.constant();

    if (dataTypeCtx) {
      expression = Builder.expression.inlineCast(
        {
          castType: dataTypeCtx.getText().toLowerCase(),
          value: expression,
        },
        {
          location: getPosition(ctx.start, dataTypeCtx.stop),
          incomplete: Boolean(ctx.exception),
        }
      );
    }

    if (constantCtx) {
      const constantExpression = this.fromConstantToArray(constantCtx);

      expression = this.toBinaryExpression(':', ctx, [expression, constantExpression]);
    }

    return expression;
  }

  // ----------------------------------------------------- expression: "source"

  private toSource(
    ctx: antlr.ParserRuleContext,
    type: 'index' | 'policy' = 'index'
  ): ast.ESQLSource {
    let text = ctx.getText();

    if (text.startsWith(`"""`) && text.endsWith(`"""`)) {
      // If wrapped by triple quote, remove
      text = text.replace(/\"\"\"/g, '');
    } else if (text.startsWith(`"`) && text.endsWith(`"`)) {
      // If wrapped by single quote, remove
      text = text.slice(1, -1);
    }

    let prefix: ast.ESQLStringLiteral | undefined;
    let index: ast.ESQLStringLiteral | undefined;
    let selector: ast.ESQLStringLiteral | undefined;

    if (ctx instanceof cst.IndexPatternContext) {
      const clusterStringCtx = ctx.clusterString();
      const unquotedIndexString = ctx.unquotedIndexString();
      const indexStringCtx = ctx.indexString();
      const selectorStringCtx = ctx.selectorString();

      if (clusterStringCtx) {
        prefix = this.toSelectorString(clusterStringCtx);
      }
      if (unquotedIndexString) {
        index = this.toSelectorString(unquotedIndexString);
      }
      if (indexStringCtx) {
        index = this.toIndexString(indexStringCtx);
      }
      if (selectorStringCtx) {
        selector = this.toSelectorString(selectorStringCtx);
      }
    }

    return Builder.expression.source.node(
      {
        sourceType: type,
        prefix,
        index,
        selector,
        name: text,
      },
      {
        location: getPosition(ctx.start, ctx.stop),
        incomplete: Boolean(ctx.exception || text === ''),
        text: ctx?.getText(),
      }
    );
  }

  /**
   * Converts selector string context to string literal
   *
   * @todo Re-use {@link toUnquotedString} here.
   */
  private toSelectorString(ctx: cst.SelectorStringContext): ast.ESQLStringLiteral {
    const unquotedCtx = ctx.UNQUOTED_SOURCE();

    const valueUnquoted = unquotedCtx.getText();
    const quotedString = LeafPrinter.string({ valueUnquoted });

    return Builder.expression.literal.string(
      valueUnquoted,
      {
        name: quotedString,
        unquoted: true,
      },
      this.createParserFieldsFromTerminalNode(unquotedCtx)
    );
  }

  /**
   * Converts UNQUOTED_IDENTIFIER or UNQUOTED_SOURCE to an unquoted string literal.
   */
  private toUnquotedString(ctx: antlr.TerminalNode): ast.ESQLStringLiteral {
    const valueUnquoted = ctx.getText();
    const quotedString = LeafPrinter.string({ valueUnquoted });

    return Builder.expression.literal.string(
      valueUnquoted,
      {
        name: quotedString,
        unquoted: true,
      },
      this.createParserFieldsFromTerminalNode(ctx)
    );
  }

  /**
   * Converts index string (quoted or unquoted) to string literal
   */
  private toIndexString(ctx: cst.IndexStringContext): ast.ESQLStringLiteral {
    const unquotedCtx = ctx.UNQUOTED_SOURCE();

    if (unquotedCtx) {
      const valueUnquoted = unquotedCtx.getText();
      const quotedString = LeafPrinter.string({ valueUnquoted });

      return Builder.expression.literal.string(
        valueUnquoted,
        {
          name: quotedString,
          unquoted: true,
        },
        this.createParserFieldsFromTerminalNode(unquotedCtx)
      );
    }

    return this.toStringLiteral(ctx);
  }

  // ----------------------------------------------------- expression: "column"

  private toColumn(
    ctx: antlr.ParserRuleContext | cst.QualifiedNamePatternContext | cst.QualifiedNameContext
  ): ast.ESQLColumn {
    const args: ast.ESQLColumn['args'] = [];
    let qualifier: ast.ESQLIdentifier | undefined;

    if (ctx instanceof cst.QualifiedNamePatternContext) {
      const node = this.fromQualifiedNamePattern(ctx);

      if (node.type === 'column') {
        return node;
      } else if (node) {
        args.push(node);
      } else {
        throw new Error(`Unexpected node type: ${(node as ast.ESQLProperNode).type} in toColumn`);
      }
    } else if (ctx instanceof cst.QualifiedNameContext) {
      const qualifierToken = ctx._qualifier;
      if (qualifierToken) {
        const qualifierNode = this.toIdentifierFromToken(qualifierToken);
        qualifier = qualifierNode;
      }

      const fieldNameCtx = ctx._name ?? ctx.fieldName();
      const list = fieldNameCtx ? fieldNameCtx.identifierOrParameter_list() : [];

      for (const item of list) {
        if (item instanceof cst.IdentifierOrParameterContext) {
          const node = this.fromIdentifierOrParam(item);

          if (node) {
            args.push(node);
          }
        }
      }
    } else {
      // This happens when ANTLR grammar does not specify a rule, for which
      // a context is created. For example, as of this writing, the FROM ... METADATA
      // uses `UNQUOTED_SOURCE` lexer tokens directly for column names, without
      // wrapping them into a context.
      const name = ctx.getText();
      const node = Builder.identifier({ name }, this.getParserFields(ctx));

      args.push(node);
    }

    const text = unescapeColumn(ctx.getText());
    const hasQuotes = Boolean(this.isQuoted(ctx.getText()));
    const column = Builder.expression.column({ args }, qualifier, {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception || text === ''),
    });

    column.name = text;
    column.quoted = hasQuotes;

    return column;
  }

  private fromQualifiedName(ctx: cst.QualifiedNameContext): ast.ESQLColumn {
    return this.toColumn(ctx);
  }

  private fromQualifiedNamePattern(
    ctx: cst.QualifiedNamePatternContext
  ): ast.ESQLColumn | ast.ESQLParam | ast.ESQLIdentifier {
    const args: ast.ESQLColumn['args'] = [];
    // TODO: new grammar also introduced here bracketed syntax.
    // See: https://github.com/elastic/kibana/pull/233585/files#diff-cecb7eac6ebaa167a4c232db56b2912984308749e8b79092c7802230bca7dff5R165-R167
    const fieldNamePatternCtx = ctx._name ?? ctx.fieldNamePattern();
    const patterns = fieldNamePatternCtx ? fieldNamePatternCtx.identifierPattern_list() : [];

    // Special case: a single parameter is returned as a param literal
    if (patterns.length === 1) {
      const only = patterns[0];

      if (!only.ID_PATTERN()) {
        const paramCtx = only.parameter?.() || only.doubleParameter?.();

        if (paramCtx) {
          const param = this.toParam(paramCtx);

          if (param) return param;
        }
      }
    }

    for (const identifierPattern of patterns) {
      const ID_PATTERN = identifierPattern.ID_PATTERN();

      if (ID_PATTERN) {
        const node = this.fromNodeToIdentifier(ID_PATTERN);

        args.push(node);
      } else {
        // Support single and double parameters inside identifierPattern
        const paramCtx = identifierPattern.parameter?.() || identifierPattern.doubleParameter?.();
        const parameter = paramCtx ? this.toParam(paramCtx) : undefined;

        if (parameter) {
          args.push(parameter);
        }
      }
    }

    const text = unescapeColumn(ctx.getText());
    const hasQuotes = Boolean(this.isQuoted(ctx.getText()));
    const qualifierToken = ctx._qualifier;
    const qualifierNode = qualifierToken ? this.toIdentifierFromToken(qualifierToken) : undefined;

    const column = Builder.expression.column({ args }, qualifierNode, {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception || text === ''),
    });

    column.name = text;
    column.quoted = hasQuotes;

    return column;
  }

  private toColumnStar(ctx: antlr.TerminalNode): ast.ESQLColumn {
    const text = ctx.getText();
    const parserFields = {
      text,
      location: getPosition(ctx.symbol),
      incomplete: ctx.getText() === '',
      quoted: false,
    };
    const node = Builder.expression.column(
      { args: [Builder.identifier({ name: '*' }, parserFields)] },
      undefined,
      parserFields
    );

    node.name = text;

    return node;
  }

  private isQuoted(text: string | undefined) {
    return text && /^(`)/.test(text);
  }

  private fromFuseKeyByFields(ctx: cst.FuseKeyByFieldsContext | undefined): ast.ESQLAstField[] {
    const fields: ast.ESQLAstField[] = [];

    if (!ctx) {
      return fields;
    }

    try {
      for (const fieldCtx of ctx.qualifiedName_list()) {
        // Skip empty nodes created by ANTLR
        if (!textExistsAndIsValid(fieldCtx.getText())) {
          continue;
        }

        const field = this.fromQualifiedName(fieldCtx);

        if (field) {
          fields.push(field);
        }
      }
    } catch (e) {
      // do nothing
    }

    return fields;
  }

  private fromFields(ctx: cst.FieldsContext | undefined): ast.ESQLAstField[] {
    const fields: ast.ESQLAstField[] = [];

    if (!ctx) {
      return fields;
    }

    try {
      for (const fieldCtx of ctx.field_list()) {
        const field = this.fromField(fieldCtx);

        if (field) {
          fields.push(field as any);
        }
      }
    } catch (e) {
      // do nothing
    }

    return fields;
  }

  private fromAggFields(ctx: cst.AggFieldsContext | undefined): ast.ESQLAstField[] {
    const fields: ast.ESQLAstField[] = [];

    if (!ctx) {
      return fields;
    }

    try {
      for (const aggField of ctx.aggField_list()) {
        if (aggField.getText() === '') continue;

        const field = this.fromAggField(aggField);

        if (field) {
          fields.push(field);
        }
      }
    } catch (e) {
      // do nothing
    }

    return fields;
  }

  private fromField(ctx: cst.FieldContext): ast.ESQLAstField | undefined {
    const qualifiedNameCtx = ctx.qualifiedName();

    if (qualifiedNameCtx && ctx.ASSIGN()) {
      const left = this.fromQualifiedName(qualifiedNameCtx);
      const right = this.fromBooleanExpressionToExpressionOrUnknown(ctx.booleanExpression());
      const args = [
        left,
        // TODO: Remove array boxing here. This fails many autocomplete tests,
        //       should be probably fixed in a standalone PR.
        [right],
      ] as ast.ESQLBinaryExpression['args'];

      const assignment = this.toFunction(
        '=',
        ctx,
        undefined,
        'binary-expression',
        args
      ) as ast.ESQLBinaryExpression;

      return assignment;
    }

    // The boolean expression parsing might result into no fields, this
    // happens when ANTLR continues to try to parse an invalid query.
    const node = this.fromBooleanExpression(ctx.booleanExpression());
    return node as ast.ESQLAstField | undefined;
  }

  // --------------------------------------------------- expression: "function"

  private fromFunction(ctx: cst.FunctionContext): ast.ESQLFunctionCallExpression {
    const functionExpressionCtx = ctx.functionExpression();
    const functionNameCtx = functionExpressionCtx.functionName();
    const mapExpressionCtx = functionExpressionCtx.mapExpression();
    const args = this.fromBooleanExpressions(functionExpressionCtx.booleanExpression_list());
    const fn: ast.ESQLFunctionCallExpression = {
      type: 'function',
      subtype: 'variadic-call',
      name: functionNameCtx.getText().toLowerCase(),
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      args,
      incomplete: Boolean(ctx.exception),
    };
    const identifierOrParameterCtx = functionNameCtx.identifierOrParameter();
    const asteriskNode = functionExpressionCtx.ASTERISK()
      ? this.toColumnStar(functionExpressionCtx.ASTERISK()!)
      : undefined;

    if (identifierOrParameterCtx instanceof cst.IdentifierOrParameterContext) {
      const operator = this.fromIdentifierOrParam(identifierOrParameterCtx);

      if (operator) {
        fn.operator = operator;
      }
    } else {
      const lastCtx = functionNameCtx.LAST();

      if (lastCtx) {
        fn.operator = this.fromNodeToIdentifier(lastCtx);
        fn.operator.name = fn.operator.name.toLowerCase();
      } else {
        const firstCtx = functionNameCtx.FIRST();

        if (firstCtx) {
          fn.operator = this.fromNodeToIdentifier(firstCtx);
          fn.operator.name = fn.operator.name.toLowerCase();
        }
      }
    }

    if (asteriskNode) {
      fn.args.push(asteriskNode);
    }

    if (mapExpressionCtx) {
      const trailingMap = this.fromMapExpression(mapExpressionCtx);

      fn.args.push(trailingMap);
    }

    return fn;
  }

  private toFunction<Subtype extends ast.FunctionSubtype>(
    name: string,
    ctx: antlr.ParserRuleContext,
    customPosition?: ast.ESQLLocation,
    subtype?: Subtype,
    args: ast.ESQLAstItem[] = [],
    incomplete?: boolean
  ): ast.ESQLFunction<Subtype> {
    const node: ast.ESQLFunction<Subtype> = {
      type: 'function',
      name,
      text: ctx.getText(),
      location: customPosition ?? getPosition(ctx.start, ctx.stop),
      args,
      incomplete: Boolean(ctx.exception) || !!incomplete,
    };

    if (subtype) {
      node.subtype = subtype;
    }

    return node;
  }

  private toBinaryExpression<
    Operator extends ast.BinaryExpressionOperator = ast.BinaryExpressionOperator
  >(
    operator: Operator,
    ctx: antlr.ParserRuleContext,
    args: ast.ESQLBinaryExpression['args'],
    template?: Omit<
      AstNodeTemplate<ast.ESQLBinaryExpression<Operator>>,
      'subtype' | 'name' | 'args'
    >
  ): ast.ESQLBinaryExpression<Operator> {
    return Builder.expression.func.binary(operator, args, template, {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    }) as ast.ESQLBinaryExpression<Operator>;
  }

  // -------------------------------------------------------- expression: "map"

  private fromMapExpression(ctx: cst.MapExpressionContext): ast.ESQLMap {
    const location = getPosition(ctx.start, ctx.stop);
    const map = Builder.expression.map(
      {},
      {
        text: this.parser.src.slice(location.min, location.max + 1),
        location,
        incomplete: Boolean(ctx.exception),
      }
    );
    const entryCtxs = ctx.entryExpression_list();

    for (const entryCtx of entryCtxs) {
      const entry = this.fromMapEntryExpression(entryCtx);

      if (entry) {
        map.entries.push(entry);

        if (entry.incomplete) {
          map.incomplete = true;
        }
      } else {
        map.incomplete = true;
      }
    }

    return map;
  }

  private fromMapEntryExpression(ctx: cst.EntryExpressionContext): ast.ESQLMapEntry | undefined {
    const keyCtx = ctx._key;
    const valueCtx = ctx._value;

    if (keyCtx && valueCtx) {
      let value: ast.ESQLAstExpression | undefined;
      const key = this.toStringLiteral(keyCtx) as ast.ESQLStringLiteral;

      if (!key) {
        return undefined;
      }

      const constantCtx = valueCtx.constant();

      if (constantCtx) {
        value = this.fromConstantToArray(constantCtx) as ast.ESQLAstExpression;
      }

      const mapExpressionCtx = valueCtx.mapExpression();

      if (mapExpressionCtx) {
        value = this.fromMapExpression(mapExpressionCtx);
      }

      if (!value) {
        value = this.fromParserRuleToUnknown(valueCtx);
        value.incomplete = true;
      }

      if (value) {
        const location = getPosition(ctx.start, ctx.stop);
        const entry = Builder.expression.entry(key, value, {
          text: this.parser.src.slice(location.min, location.max + 1),
          location,
          incomplete: Boolean(ctx.exception) || key.incomplete || value.incomplete,
        });

        return entry;
      }
    }
    return undefined;
  }

  // ----------------------------------------------------- constant expressions

  private fromConstant(ctx: cst.ConstantContext): ast.ESQLAstExpression | undefined {
    const node = this.fromConstantToArray(ctx);

    if (Array.isArray(node)) {
      return resolveItem(node);
    }

    return node;
  }

  private fromConstantStrict(ctx: cst.ConstantContext): ast.ESQLAstExpression {
    return this.fromConstant(ctx) ?? this.fromParserRuleToUnknown(ctx);
  }

  /**
   * @todo Make return type more specific.
   * @todo Make it not return arrays.
   */
  private fromConstantToArray(ctx: cst.ConstantContext): ast.ESQLAstItem {
    if (ctx instanceof cst.NullLiteralContext) {
      return this.toLiteral('null', ctx.NULL());
    } else if (ctx instanceof cst.QualifiedIntegerLiteralContext) {
      return this.fromQualifiedIntegerLiteral(ctx);
    } else if (ctx instanceof cst.DecimalLiteralContext) {
      return this.toNumericLiteral(ctx.decimalValue(), 'double');
    } else if (ctx instanceof cst.IntegerLiteralContext) {
      return this.toNumericLiteral(ctx.integerValue(), 'integer');
    } else if (ctx instanceof cst.IntegerValueContext) {
      return this.toNumericLiteral(ctx, 'integer');
    } else if (ctx instanceof cst.BooleanLiteralContext) {
      return this.getBooleanValue(ctx);
    } else if (ctx instanceof cst.StringLiteralContext) {
      return this.toStringLiteral(ctx.string_());
    } else if (ctx instanceof cst.NumericArrayLiteralContext) {
      return this.fromNumericArrayLiteral(ctx);
    } else if (ctx instanceof cst.BooleanArrayLiteralContext) {
      return this.fromBooleanArrayLiteral(ctx);
    } else if (ctx instanceof cst.StringArrayLiteralContext) {
      return this.fromStringArrayLiteral(ctx);
    } else if (ctx instanceof cst.InputParameterContext && ctx.children) {
      return this.fromInputParameter(ctx);
    } else {
      return this.fromParserRuleToUnknown(ctx);
    }
  }

  // ------------------------------------------- constant expression: "literal"

  /**
   * @deprecated
   * @todo This method should not exist, the two call sites should be replaced
   *     by a more specific implementation.
   */
  private toLiteral(
    type: ast.ESQLLiteral['literalType'],
    node: antlr.TerminalNode | null
  ): ast.ESQLLiteral {
    if (!node) {
      // TODO: This should not return a *broken) literal.
      return {
        type: 'literal',
        name: 'unknown',
        text: 'unknown',
        value: 'unknown',
        literalType: type,
        location: { min: 0, max: 0 },
        incomplete: false, // TODO: Should be true?
      } as ast.ESQLLiteral;
    }

    const text = node.getText();
    const partialLiteral: Omit<ast.ESQLLiteral, 'literalType' | 'value'> = {
      type: 'literal',
      text,
      name: text,
      location: getPosition(node.symbol),
      incomplete: /<missing /.test(text),
    };
    if (type === 'double' || type === 'integer') {
      return {
        ...partialLiteral,
        literalType: type,
        value: Number(text),
        paramType: 'number',
      } as ast.ESQLNumericLiteral<'double'> | ast.ESQLNumericLiteral<'integer'>;
    } else if (type === 'param') {
      throw new Error('Should never happen');
    }

    return {
      ...partialLiteral,
      literalType: type,
      value: text,
    } as ast.ESQLLiteral;
  }

  private toNumericLiteral<Type extends ast.ESQLNumericLiteralType>(
    ctx: cst.DecimalValueContext | cst.IntegerValueContext,
    literalType: Type
  ): Type extends 'double' ? ast.ESQLDecimalLiteral : ast.ESQLIntegerLiteral {
    return Builder.expression.literal.numeric(
      { value: Number(ctx.getText()), literalType },
      this.getParserFields(ctx)
    ) as Type extends 'double' ? ast.ESQLDecimalLiteral : ast.ESQLIntegerLiteral;
  }

  private fromNumericValue(
    ctx: cst.NumericValueContext
  ): ast.ESQLDecimalLiteral | ast.ESQLIntegerLiteral {
    const integerCtx = ctx.integerValue();

    if (integerCtx) {
      return this.toNumericLiteral(integerCtx, 'integer');
    }

    return this.toNumericLiteral(ctx.decimalValue()!, 'double');
  }

  private fromStringOrParameter(
    ctx: cst.StringOrParameterContext
  ): ast.ESQLStringLiteral | ast.ESQLParam | undefined {
    const stringCtx = ctx.string_();

    if (stringCtx) {
      return this.toStringLiteral(stringCtx);
    }

    const paramCtx = ctx.parameter();

    if (paramCtx) {
      return this.fromParameter(paramCtx);
    }

    return undefined;
  }

  private toStringLiteral(
    ctx: Pick<cst.StringContext, 'QUOTED_STRING'> & antlr.ParserRuleContext
  ): ast.ESQLStringLiteral {
    const quotedString = ctx.QUOTED_STRING()?.getText() ?? '""';
    const isTripleQuoted = quotedString.startsWith('"""') && quotedString.endsWith('"""');
    let valueUnquoted = isTripleQuoted ? quotedString.slice(3, -3) : quotedString.slice(1, -1);

    if (!isTripleQuoted) {
      valueUnquoted = valueUnquoted
        .replace(/\\"/g, '"')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }

    return Builder.expression.literal.string(
      valueUnquoted,
      {
        name: quotedString,
      },
      this.getParserFields(ctx)
    );
  }

  private fromParameter(ctx: cst.ParameterContext): ast.ESQLParam | undefined {
    return this.toParam(ctx);
  }

  private fromInputParameter(ctx: cst.InputParameterContext): ast.ESQLLiteral[] {
    const values: ast.ESQLLiteral[] = [];
    const children = ctx.children;

    if (children) {
      for (const child of children) {
        const param = this.toParam(child);

        if (param) values.push(param);
      }
    }

    return values;
  }

  private toParam(ctx: antlr.ParseTree): ast.ESQLParam | undefined {
    if (ctx instanceof cst.InputParamContext || ctx instanceof cst.InputDoubleParamsContext) {
      const isDoubleParam = ctx instanceof cst.InputDoubleParamsContext;
      const paramKind: ast.ESQLParamKinds = isDoubleParam ? '??' : '?';

      return Builder.param.unnamed(this.getParserFields(ctx), { paramKind });
    } else if (
      ctx instanceof cst.InputNamedOrPositionalParamContext ||
      ctx instanceof cst.InputNamedOrPositionalDoubleParamsContext
    ) {
      const isDoubleParam = ctx instanceof cst.InputNamedOrPositionalDoubleParamsContext;
      const paramKind: ast.ESQLParamKinds = isDoubleParam ? '??' : '?';
      const text = ctx.getText();
      const value = text.slice(isDoubleParam ? 2 : 1);
      const valueAsNumber = Number(value);
      const isPositional = String(valueAsNumber) === value;
      const parserFields = this.getParserFields(ctx);

      if (isPositional) {
        return Builder.param.positional({ paramKind, value: valueAsNumber }, parserFields);
      } else {
        return Builder.param.named({ paramKind, value }, parserFields);
      }
    }
  }

  // ---------------------------------------------- constant expression: "list"

  private fromNumericArrayLiteral(ctx: cst.NumericArrayLiteralContext): ast.ESQLList {
    const values = ctx.numericValue_list().map((childCtx) => this.fromNumericValue(childCtx));
    const parserFields = this.getParserFields(ctx);

    return Builder.expression.list.literal({ values }, parserFields);
  }

  private fromBooleanArrayLiteral(ctx: cst.BooleanArrayLiteralContext): ast.ESQLList {
    const values = ctx.booleanValue_list().map((childCtx) => this.getBooleanValue(childCtx)!);
    const parserFields = this.getParserFields(ctx);

    return Builder.expression.list.literal({ values }, parserFields);
  }

  private fromStringArrayLiteral(ctx: cst.StringArrayLiteralContext): ast.ESQLList {
    const values = ctx.string__list().map((childCtx) => this.toStringLiteral(childCtx)!);
    const parserFields = this.getParserFields(ctx);

    return Builder.expression.list.literal({ values }, parserFields);
  }

  /**
   * Constructs a *tuple* `list` AST node (round parens):
   *
   * ```
   * (1, 2, 3)
   * ```
   *
   * Can be used in IN-expression:
   *
   * ```
   * WHERE x IN (1, 2, 3)
   * ```
   */
  private toTuple(
    ctxs: cst.ValueExpressionContext[],
    leftParen?: antlr.TerminalNode,
    rightParen?: antlr.TerminalNode
  ): ast.ESQLList {
    const values: ast.ESQLAstExpression[] = [];
    let incomplete = false;

    for (const elementCtx of ctxs) {
      const element = this.visitValueExpression(elementCtx);

      if (!element) {
        continue;
      }

      const resolved = resolveItem(element) as ast.ESQLAstExpression;

      if (!resolved) {
        continue;
      }

      values.push(resolved);

      if (resolved.incomplete) {
        incomplete = true;
      }
    }

    if (!values.length) {
      incomplete = true;
    }

    const node = Builder.expression.list.tuple(
      { values },
      {
        incomplete,
        location: getPosition(
          leftParen?.symbol ?? ctxs[0]?.start,
          rightParen?.symbol ?? ctxs[ctxs.length - 1]?.stop
        ),
      }
    );

    return node;
  }

  // -------------------------------------- constant expression: "timeInterval"

  private fromQualifiedIntegerLiteral(
    ctx: cst.QualifiedIntegerLiteralContext
  ): ast.ESQLTimeDurationLiteral | ast.ESQLDatePeriodLiteral {
    const value = ctx.integerValue().INTEGER_LITERAL().getText();
    const unit = ctx.UNQUOTED_IDENTIFIER().symbol.text;
    const parserFields = this.getParserFields(ctx);

    return Builder.expression.literal.timespan(Number(value), unit, parserFields);
  }

  // ---------------------------------------- constant expression: "identifier"

  private fromIdentifierOrParam(
    ctx: cst.IdentifierOrParameterContext
  ): ast.ESQLIdentifier | ast.ESQLParam | undefined {
    const identifier = ctx.identifier();

    if (identifier) {
      return this.fromIdentifier(identifier);
    }

    const parameter = ctx.parameter() ?? ctx.doubleParameter();

    if (parameter) {
      return this.toParam(parameter);
    }
  }

  private fromIdentifier(ctx: cst.IdentifierContext): ast.ESQLIdentifier {
    const node = ctx.QUOTED_IDENTIFIER() || ctx.UNQUOTED_IDENTIFIER() || ctx.start;

    return this.fromNodeToIdentifier(node);
  }

  private fromNodeToIdentifier(node: antlr.TerminalNode): ast.ESQLIdentifier {
    let name = node.getText();
    const firstChar = name[0];
    const lastChar = name[name.length - 1];
    const isQuoted = firstChar === '`' && lastChar === '`';

    if (isQuoted) {
      name = name.slice(1, -1).replace(/``/g, '`');
    }

    const parserFields = this.createParserFieldsFromToken(node.symbol);
    const identifier = Builder.identifier({ name }, parserFields);

    return identifier;
  }
}
