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
import { isCommand } from '../ast/is';
import { LeafPrinter } from '../pretty_print';
import { getPosition, parseIdentifier, nonNullable } from './helpers';
import { firstItem, lastItem, resolveItem } from '../visitor/utils';
import { type AstNodeParserFields, Builder } from '../builder';
import { type ArithmeticUnaryContext } from '../antlr/esql_parser';
import type { Parser } from './parser';

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

  private fromParserRuleToUnknown(ctx: antlr.ParserRuleContext): ast.ESQLUnknownItem {
    return {
      type: 'unknown',
      name: 'unknown',
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    };
  }

  // TODO: Rename this.
  private computeLocationExtends(fn: ast.ESQLFunction) {
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
   * @todo Replace this by `Walker`, if necessary, or remove completely.
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

  private getUnquotedText(ctx: antlr.ParserRuleContext) {
    return [68 /* esql_parser.UNQUOTED_IDENTIFIER */, 77 /* esql_parser.UNQUOTED_SOURCE */]
      .map((keyCode) => ctx.getToken(keyCode, 0))
      .filter(nonNullable)[0];
  }

  /**
   * Follow a similar logic to the ES one:
   * * remove backticks at the beginning and at the end
   * * remove double backticks
   */
  private safeBackticksRemoval(text: string | undefined) {
    return text?.replace(/^`{1}|`{1}$/g, '').replace(/``/g, '`') || '';
  }

  private sanitizeIdentifierString(ctx: antlr.ParserRuleContext) {
    const result =
      this.getUnquotedText(ctx)?.getText() ||
      this.safeBackticksRemoval(this.getQuotedText(ctx)?.getText()) ||
      this.safeBackticksRemoval(ctx.getText()); // for some reason some quoted text is not detected correctly by the parser
    // TODO - understand why <missing null> is now returned as the match text for the FROM command
    return result === '<missing null>' ? '' : result;
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

  private toOption(name: string, ctx: antlr.ParserRuleContext): ast.ESQLCommandOption {
    return {
      type: 'option',
      name,
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      args: [],
      incomplete: Boolean(
        ctx.exception ||
          ctx.children?.some((c) => {
            // TODO: 1. Remove this expect error comment
            // TODO: 2. .isErrorNode is function: .isErrorNode()
            // @ts-expect-error not exposed in type but exists see https://github.com/antlr/antlr4/blob/v4.11.1/runtime/JavaScript/src/antlr4/tree/ErrorNodeImpl.js#L19
            return Boolean(c.isErrorNode);
          })
      ),
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

  private fromFromCommand(ctx: cst.FromCommandContext): ast.ESQLCommand<'from'> {
    const command = this.createCommand('from', ctx);
    const indexPatternCtx = ctx.indexPatternAndMetadataFields();
    const metadataCtx = indexPatternCtx.metadata();
    const sources = indexPatternCtx
      .getTypedRuleContexts(cst.IndexPatternContext as any)
      .map((sourceCtx) => this.toSource(sourceCtx));

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

  // ---------------------------------------------------------------------- ROW

  private fromRowCommand(ctx: cst.RowCommandContext): ast.ESQLCommand<'row'> {
    const command = this.createCommand('row', ctx);
    const fields = this.fromFields(ctx.fields());

    command.args.push(...fields);

    return command;
  }

  // ----------------------------------------------------------------------- TS

  private fromTimeseriesCommand(ctx: cst.TimeSeriesCommandContext): ast.ESQLAstTimeseriesCommand {
    const command = this.createCommand('ts', ctx) as ast.ESQLAstTimeseriesCommand;
    const indexPatternCtx = ctx.indexPatternAndMetadataFields();
    const metadataCtx = indexPatternCtx.metadata();
    const sources = indexPatternCtx
      .getTypedRuleContexts(cst.IndexPatternContext as any)
      .map((sourceCtx) => this.toSource(sourceCtx));

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
      const limitValue = this.fromConstant(ctx.constant());
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

    const expressions = this.collectBooleanExpression(ctx.booleanExpression());

    command.args.push(expressions[0]);

    return command;
  }

  // --------------------------------------------------------------------- KEEP

  private fromKeepCommand(ctx: cst.KeepCommandContext): ast.ESQLCommand<'keep'> {
    const command = this.createCommand('keep', ctx);
    const identifiers = this.toColumnsFromCommand(ctx);

    command.args.push(...identifiers);

    return command;
  }

  // -------------------------------------------------------------------- STATS

  private fromStatsCommand(ctx: cst.StatsCommandContext): ast.ESQLCommand<'stats'> {
    const command = this.createCommand('stats', ctx);

    if (ctx._stats) {
      const fields = ctx.aggFields();

      for (const fieldCtx of fields.aggField_list()) {
        if (fieldCtx.getText() === '') continue;

        const node = this.fromAggField(fieldCtx);

        command.args.push(node);
      }
    }

    if (ctx._grouping) {
      const options = this.toByOption(ctx, ctx.fields());

      command.args.push(...options);
    }

    return command;
  }

  private fromAggField(ctx: cst.AggFieldContext) {
    const fieldCtx = ctx.field();
    const field = this.fromField(fieldCtx);

    const booleanExpression = ctx.booleanExpression();

    if (!booleanExpression) {
      return field;
    }

    const condition = this.collectBooleanExpression(booleanExpression)[0];
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

  private fromField(ctx: cst.FieldContext) {
    return this.fromField2(ctx)[0];
  }

  /**
   * @todo Do not return array here.
   */
  private toByOption(
    ctx: cst.StatsCommandContext | cst.InlinestatsCommandContext,
    expr: cst.FieldsContext | undefined
  ): ast.ESQLCommandOption[] {
    const byCtx = ctx.BY();

    if (!byCtx || !expr) {
      return [];
    }

    const option = this.toOption(byCtx.getText().toLowerCase(), ctx);

    option.args.push(...this.fromFields(expr));
    option.location.min = byCtx.symbol.start;

    const lastArg = lastItem(option.args);

    if (lastArg) option.location.max = lastArg.location.max;

    return [option];
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
    const arg = this.collectBooleanExpression(ctx.booleanExpression())[0];

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
      this.createParserFields(ctx)
    );
  }

  // --------------------------------------------------------------------- DROP

  private fromDropCommand(ctx: cst.DropCommandContext): ast.ESQLCommand<'drop'> {
    const command = this.createCommand('drop', ctx);
    const identifiers = this.toColumnsFromCommand(ctx);

    command.args.push(...identifiers);

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
          const renameFunction = this.createFunction(
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
    const primaryExpression = this.visitPrimaryExpression(ctx.primaryExpression());
    const stringContext = ctx.string_();
    const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
    const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

    command.args.push(primaryExpression);

    if (doParseStringAndOptions) {
      const stringNode = this.createLiteralString(stringContext);

      command.args.push(stringNode);
      command.args.push(...this.fromCommandOptions(ctx.commandOptions()));
    }

    return command;
  }

  private fromCommandOptions(ctx: cst.CommandOptionsContext | undefined): ast.ESQLCommandOption[] {
    if (!ctx) {
      return [];
    }

    const options: ast.ESQLCommandOption[] = [];

    for (const optionCtx of ctx.commandOption_list()) {
      const option = this.toOption(
        this.sanitizeIdentifierString(optionCtx.identifier()).toLowerCase(),
        optionCtx
      );
      options.push(option);
      // it can throw while accessing constant for incomplete commands, so try catch it
      try {
        const optionValue = this.fromConstant(optionCtx.constant());
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
    const primaryExpression = this.visitPrimaryExpression(ctx.primaryExpression());
    const stringContext = ctx.string_();
    const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
    const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

    command.args.push(primaryExpression);

    if (doParseStringAndOptions) {
      const stringNode = this.createLiteralString(stringContext);

      command.args.push(stringNode);
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

    command.args.push(
      ...this.toOnOptionFromEnrichCommand(ctx),
      ...this.toWithOptionFromEnrichCommand(ctx)
    );

    return command;
  }

  private toPolicyNameFromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLSource {
    const policyName = ctx._policyName;

    if (!policyName || !textExistsAndIsValid(policyName.text)) {
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
          location: { min: policyName.start, max: policyName.stop },
        }
      );
      return source;
    }

    const name = ctx._policyName.text;
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
          location: { min: policyName.start, max: policyName.start + prefixName.length - 1 },
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
            min: policyName.start + prefixName.length + 1,
            max: policyName.stop,
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
          location: { min: policyName.start, max: policyName.stop },
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
          min: policyName.start,
          max: policyName.stop,
        },
      }
    );

    return source;
  }

  /**
   * @todo Make it return a single ON option.
   */
  private toOnOptionFromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLCommandOption[] {
    if (!ctx._matchField) {
      return [];
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

      return [fn];
    }

    return [];
  }

  /**
   * @todo Make it return a single WITH option.
   */
  private toWithOptionFromEnrichCommand(ctx: cst.EnrichCommandContext): ast.ESQLCommandOption[] {
    const options: ast.ESQLCommandOption[] = [];
    const withCtx = ctx.WITH();

    if (withCtx) {
      const option = this.toOption(withCtx.getText().toLowerCase(), ctx);
      const clauses = ctx.enrichWithClause_list();

      options.push(option);

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
            const fn = this.createFunction('=', clause, undefined, 'binary-expression');
            fn.args.push(args[0], args[1] ? [args[1]] : []);
            option.args.push(fn);
          }
        }

        const location = option.location;
        const lastArg = lastItem(option.args);

        location.min = withCtx.symbol.start;
        location.max = lastArg?.location?.max ?? withCtx.symbol.stop;
      }
    }

    return options;
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

    for (const joinPredicateCtx of joinCondition.joinPredicate_list()) {
      const expression = this.visitValueExpression(joinPredicateCtx.valueExpression());

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
    return this.toSource(ctx._index);
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

      const prompt = this.visitPrimaryExpression(ctx._prompt) as ast.ESQLSingleAstItem;
      command.prompt = prompt;

      const assignment = this.createFunction(
        ctx.ASSIGN().getText(),
        ctx,
        undefined,
        'binary-expression'
      );
      assignment.args.push(targetField, prompt);
      // update the location of the assign based on arguments
      assignment.location = this.computeLocationExtends(assignment);

      command.targetField = targetField;
      command.args.push(assignment);
    } else if (ctx._prompt) {
      const prompt = this.visitPrimaryExpression(ctx._prompt) as ast.ESQLSingleAstItem;
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
        inferenceId = this.createIdentifierOrParam(ctx._inferenceId)!;
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
      const probability = this.fromConstant(ctx.constant());
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
      command.args.push(...this.fromAggFields(ctx.aggFields()));
    }
    if (ctx._grouping) {
      command.args.push(...this.toByOption(ctx, ctx.fields()));
    }

    return command;
  }

  // ------------------------------------------------------------------- RERANK

  private fromRerankCommand(ctx: cst.RerankCommandContext): ast.ESQLAstRerankCommand {
    const command = this.createCommand<'rerank', ast.ESQLAstRerankCommand>('rerank', ctx, {});

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

  // -------------------------------------------------------------- expressions

  private toColumnsFromCommand(
    ctx:
      | cst.KeepCommandContext
      | cst.DropCommandContext
      | cst.MvExpandCommandContext
      | cst.MetadataContext
  ): ast.ESQLColumn[] {
    const identifiers = this.extractIdentifiers(ctx);

    return this.makeColumnsOutOfIdentifiers(identifiers);
  }

  private extractIdentifiers(
    ctx:
      | cst.KeepCommandContext
      | cst.DropCommandContext
      | cst.MvExpandCommandContext
      | cst.MetadataContext
  ) {
    if (ctx instanceof cst.MetadataContext) {
      return ctx
        .UNQUOTED_SOURCE_list()
        .map((node) => {
          // TODO: Parse this without wrapping into ParserRuleContext
          return this.terminalNodeToParserRuleContext(node);
        })
        .flat();
    }
    if (ctx instanceof cst.MvExpandCommandContext) {
      return this.wrapIdentifierAsArray(ctx.qualifiedName());
    }

    return this.wrapIdentifierAsArray(ctx.qualifiedNamePatterns().qualifiedNamePattern_list());
  }

  private wrapIdentifierAsArray<T extends antlr.ParserRuleContext>(identifierCtx: T | T[]): T[] {
    return Array.isArray(identifierCtx) ? identifierCtx : [identifierCtx];
  }

  /**
   * @deprecated
   * @todo Parse without constructing this ANTLR internal class instance.
   */
  private terminalNodeToParserRuleContext(node: antlr.TerminalNode): antlr.ParserRuleContext {
    const context = new antlr.ParserRuleContext();
    context.start = node.symbol;
    context.stop = node.symbol;
    context.children = [node];
    return context;
  }

  private makeColumnsOutOfIdentifiers(identifiers: antlr.ParserRuleContext[]): ast.ESQLColumn[] {
    const args: ast.ESQLColumn[] =
      identifiers
        .filter((child) => textExistsAndIsValid(child.getText()))
        .map((sourceContext) => {
          return this.toColumn(sourceContext);
        }) ?? [];

    return args;
  }

  private fromFields(ctx: cst.FieldsContext | undefined): ast.ESQLAstField[] {
    const fields: ast.ESQLAstField[] = [];

    if (!ctx) {
      return fields;
    }

    try {
      for (const field of ctx.field_list()) {
        fields.push(...(this.fromField2(field) as ast.ESQLAstField[]));
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
        fields.push(...(this.fromField2(aggField.field()) as ast.ESQLAstField[]));
      }
    } catch (e) {
      // do nothing
    }

    return fields;
  }

  /**
   * @todo Align this method with the `fromField` method.
   */
  private fromField2(ctx: cst.FieldContext): ast.ESQLAstItem[] {
    if (ctx.qualifiedName() && ctx.ASSIGN()) {
      const fn = this.createFunction(ctx.ASSIGN()!.getText(), ctx, undefined, 'binary-expression');

      fn.args.push(
        this.toColumn(ctx.qualifiedName()!),
        this.collectBooleanExpression(ctx.booleanExpression())
      );
      fn.location = this.computeLocationExtends(fn);

      return [fn];
    }

    return this.collectBooleanExpression(ctx.booleanExpression());
  }

  private visitLogicalNot(ctx: cst.LogicalNotContext) {
    const fn = this.createFunction('not', ctx, undefined, 'unary-expression');
    fn.args.push(...this.collectBooleanExpression(ctx.booleanExpression()));
    // update the location of the assign based on arguments
    const argsLocationExtends = this.computeLocationExtends(fn);
    fn.location = argsLocationExtends;
    return fn;
  }

  private visitLogicalAndsOrs(ctx: cst.LogicalBinaryContext) {
    const fn = this.createFunction(ctx.AND() ? 'and' : 'or', ctx, undefined, 'binary-expression');
    fn.args.push(
      ...this.collectBooleanExpression(ctx._left),
      ...this.collectBooleanExpression(ctx._right)
    );
    // update the location of the assign based on arguments
    const argsLocationExtends = this.computeLocationExtends(fn);
    fn.location = argsLocationExtends;
    return fn;
  }

  /**
   * Constructs a tuple list (round parens):
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
   *
   * @todo Rename this method.
   * @todo Move to "list"
   */
  private visitTuple(
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

  private visitLogicalIns(ctx: cst.LogicalInContext) {
    const [leftCtx, ...rightCtxs] = ctx.valueExpression_list();
    const left = resolveItem(
      this.visitValueExpression(leftCtx) ?? this.fromParserRuleToUnknown(leftCtx)
    ) as ast.ESQLAstExpression;
    const right = this.visitTuple(rightCtxs, ctx.LP(), ctx.RP());
    const expression = this.createFunction(
      ctx.NOT() ? 'not in' : 'in',
      ctx,
      { min: ctx.start.start, max: ctx.stop?.stop ?? ctx.RP().symbol.stop },
      'binary-expression',
      [left, right],
      left.incomplete || right.incomplete
    );

    return expression;
  }

  private getMathOperation(ctx: cst.ArithmeticBinaryContext) {
    return (
      (ctx.PLUS() || ctx.MINUS() || ctx.ASTERISK() || ctx.SLASH() || ctx.PERCENT()).getText() || ''
    );
  }

  /**
   * @todo Inline this method.
   */
  private getComparisonName(ctx: cst.ComparisonOperatorContext) {
    return (
      (ctx.EQ() || ctx.NEQ() || ctx.LT() || ctx.LTE() || ctx.GT() || ctx.GTE()).getText() || ''
    );
  }

  private visitValueExpression(ctx: cst.ValueExpressionContext) {
    if (!textExistsAndIsValid(ctx.getText())) {
      return [];
    }
    if (ctx instanceof cst.ValueExpressionDefaultContext) {
      return this.visitOperatorExpression(ctx.operatorExpression());
    }
    if (ctx instanceof cst.ComparisonContext) {
      const comparisonNode = ctx.comparisonOperator();
      const comparisonFn = this.createFunction(
        this.getComparisonName(comparisonNode),
        comparisonNode,
        undefined,
        'binary-expression'
      );
      comparisonFn.args.push(
        this.visitOperatorExpression(ctx._left)!,
        this.visitOperatorExpression(ctx._right)!
      );
      // update the location of the comparisonFn based on arguments
      const argsLocationExtends = this.computeLocationExtends(comparisonFn);
      comparisonFn.location = argsLocationExtends;

      return comparisonFn;
    }
  }

  private visitOperatorExpression(
    ctx: cst.OperatorExpressionContext
  ): ast.ESQLAstItem | ast.ESQLAstItem[] | undefined {
    if (ctx instanceof cst.ArithmeticUnaryContext) {
      const arg = this.visitOperatorExpression(ctx.operatorExpression());
      // this is a number sign thing
      const fn = this.createFunction('*', ctx, undefined, 'binary-expression');
      fn.args.push(this.createFakeMultiplyLiteral(ctx, 'integer'));
      if (arg) {
        fn.args.push(arg);
      }
      return fn;
    } else if (ctx instanceof cst.ArithmeticBinaryContext) {
      const fn = this.createFunction(
        this.getMathOperation(ctx),
        ctx,
        undefined,
        'binary-expression'
      );
      const args = [
        this.visitOperatorExpression(ctx._left),
        this.visitOperatorExpression(ctx._right),
      ];
      for (const arg of args) {
        if (arg) {
          fn.args.push(arg);
        }
      }
      // update the location of the assign based on arguments
      const argsLocationExtends = this.computeLocationExtends(fn);
      fn.location = argsLocationExtends;
      return fn;
    } else if (ctx instanceof cst.OperatorExpressionDefaultContext) {
      return this.visitPrimaryExpression(ctx.primaryExpression());
    }
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

  private visitPrimaryExpression(
    ctx: cst.PrimaryExpressionContext
  ): ast.ESQLAstItem | ast.ESQLAstItem[] {
    if (ctx instanceof cst.ConstantDefaultContext) {
      return this.fromConstant(ctx.constant());
    } else if (ctx instanceof cst.DereferenceContext) {
      return this.toColumn(ctx.qualifiedName());
    } else if (ctx instanceof cst.ParenthesizedExpressionContext) {
      return this.collectBooleanExpression(ctx.booleanExpression());
    } else if (ctx instanceof cst.FunctionContext) {
      const functionExpressionCtx = ctx.functionExpression();
      const fn = this.createFunctionCall(ctx);
      const asteriskArg = functionExpressionCtx.ASTERISK()
        ? this.toColumnStar(functionExpressionCtx.ASTERISK()!)
        : undefined;
      if (asteriskArg) {
        fn.args.push(asteriskArg);
      }

      // TODO: Remove array manipulations here.
      const functionArgs = functionExpressionCtx
        .booleanExpression_list()
        .flatMap(this.collectBooleanExpression.bind(this))
        .filter(nonNullable);

      if (functionArgs.length) {
        fn.args.push(...(functionArgs as any));
      }

      const mapExpressionCtx = functionExpressionCtx.mapExpression();

      if (mapExpressionCtx) {
        const trailingMap = this.fromMapExpression(mapExpressionCtx);

        fn.args.push(trailingMap);
      }

      return fn;
    } else if (ctx instanceof cst.InlineCastContext) {
      return this.collectInlineCast(ctx);
    }
    return this.fromParserRuleToUnknown(ctx);
  }

  private collectInlineCast(ctx: cst.InlineCastContext): ast.ESQLInlineCast {
    const value = this.visitPrimaryExpression(ctx.primaryExpression());

    return Builder.expression.inlineCast(
      { castType: ctx.dataType().getText().toLowerCase() as ast.InlineCastingType, value },
      this.createParserFields(ctx)
    );
  }

  private collectLogicalExpression(ctx: cst.BooleanExpressionContext) {
    if (ctx instanceof cst.LogicalNotContext) {
      return [this.visitLogicalNot(ctx)];
    }
    if (ctx instanceof cst.LogicalBinaryContext) {
      return [this.visitLogicalAndsOrs(ctx)];
    }
    if (ctx instanceof cst.LogicalInContext) {
      return [this.visitLogicalIns(ctx)];
    }
    return [];
  }

  private collectRegexExpression(ctx: cst.BooleanExpressionContext): ast.ESQLFunction[] {
    const regexes = ctx.getTypedRuleContexts(cst.RegexBooleanExpressionContext);
    const ret: ast.ESQLFunction[] = [];
    return ret.concat(
      regexes
        .map((regex) => {
          if (
            regex instanceof cst.RlikeExpressionContext ||
            regex instanceof cst.LikeExpressionContext
          ) {
            const negate = regex.NOT();
            const likeType = regex instanceof cst.RlikeExpressionContext ? 'rlike' : 'like';
            const fnName = `${negate ? 'not ' : ''}${likeType}`;
            const fn = this.createFunction(fnName, regex, undefined, 'binary-expression');
            const arg = this.visitValueExpression(regex.valueExpression());
            if (arg) {
              fn.args.push(arg);

              const literal = this.createLiteralString(regex.string_());

              fn.args.push(literal);
            }
            return fn;
          }
          return undefined;
        })
        .filter(nonNullable)
    );
  }

  private collectIsNullExpression(ctx: cst.BooleanExpressionContext) {
    if (!(ctx instanceof cst.IsNullContext)) {
      return [];
    }
    const negate = ctx.NOT();
    const fnName = `is${negate ? ' not ' : ' '}null`;
    const fn = this.createFunction(fnName, ctx, undefined, 'postfix-unary-expression');
    const arg = this.visitValueExpression(ctx.valueExpression());
    if (arg) {
      fn.args.push(arg);
    }
    return [fn];
  }

  private collectDefaultExpression(ctx: cst.BooleanExpressionContext) {
    if (!(ctx instanceof cst.BooleanDefaultContext)) {
      return [];
    }
    const arg = this.visitValueExpression(ctx.valueExpression());
    return arg ? [arg] : [];
  }

  private collectBooleanExpression(
    ctx: cst.BooleanExpressionContext | undefined
  ): ast.ESQLAstItem[] {
    const list: ast.ESQLAstItem[] = [];

    if (!ctx) {
      return list;
    }

    if (ctx instanceof cst.MatchExpressionContext) {
      return [this.visitMatchExpression(ctx)];
    }

    // TODO: Remove these list traversals and concatenations.
    return list
      .concat(
        this.collectLogicalExpression(ctx),
        this.collectRegexExpression(ctx),
        this.collectIsNullExpression(ctx),
        this.collectDefaultExpression(ctx)
      )
      .flat();
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
          castType: dataTypeCtx.getText().toLowerCase() as ast.InlineCastingType,
          value: expression,
        },
        {
          location: getPosition(ctx.start, dataTypeCtx.stop),
          incomplete: Boolean(ctx.exception),
        }
      );
    }

    if (constantCtx) {
      const constantExpression = this.fromConstant(constantCtx);

      expression = this.createBinaryExpression(':', ctx, [expression, constantExpression]);
    }

    return expression;
  }

  // ----------------------------------------------------- expression: "source"

  private toSource(
    ctx: antlr.ParserRuleContext,
    type: 'index' | 'policy' = 'index'
  ): ast.ESQLSource {
    const text = this.sanitizeSourceString(ctx);

    let prefix: ast.ESQLStringLiteral | undefined;
    let index: ast.ESQLStringLiteral | undefined;
    let selector: ast.ESQLStringLiteral | undefined;

    if (ctx instanceof cst.IndexPatternContext) {
      const clusterStringCtx = ctx.clusterString();
      const unquotedIndexString = ctx.unquotedIndexString();
      const indexStringCtx = ctx.indexString();
      const selectorStringCtx = ctx.selectorString();

      if (clusterStringCtx) {
        prefix = this.visitQuotedString(clusterStringCtx);
      }
      if (unquotedIndexString) {
        index = this.visitQuotedString(unquotedIndexString);
      }
      if (indexStringCtx) {
        index = this.visitUnquotedOrQuotedString(indexStringCtx);
      }
      if (selectorStringCtx) {
        selector = this.visitQuotedString(selectorStringCtx);
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

  // TODO: clean up "source" node helpers.

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

  private sanitizeSourceString(ctx: antlr.ParserRuleContext) {
    const contextText = ctx.getText();
    // If wrapped by triple quote, remove
    if (contextText.startsWith(`"""`) && contextText.endsWith(`"""`)) {
      return contextText.replace(/\"\"\"/g, '');
    }
    // If wrapped by single quote, remove
    if (contextText.startsWith(`"`) && contextText.endsWith(`"`)) {
      return contextText.slice(1, -1);
    }
    return contextText;
  }

  private visitQuotedString(ctx: cst.SelectorStringContext): ast.ESQLStringLiteral {
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

  private visitUnquotedOrQuotedString(ctx: cst.IndexStringContext): ast.ESQLStringLiteral {
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

    return this.createLiteralString(ctx);
  }

  // ----------------------------------------------------- expression: "column"

  private toColumn(ctx: antlr.ParserRuleContext): ast.ESQLColumn {
    const args: ast.ESQLColumn['args'] = [];

    if (ctx instanceof cst.QualifiedNamePatternContext) {
      const list = ctx.identifierPattern_list();

      for (const identifierPattern of list) {
        const ID_PATTERN = identifierPattern.ID_PATTERN();

        if (ID_PATTERN) {
          const name = parseIdentifier(ID_PATTERN.getText());
          const node = Builder.identifier({ name }, this.createParserFields(identifierPattern));

          args.push(node);
        } else {
          const parameter = this.toParam(identifierPattern.parameter());

          if (parameter) {
            args.push(parameter);
          }
        }
      }
    } else if (ctx instanceof cst.QualifiedNameContext) {
      const list = ctx.identifierOrParameter_list();

      for (const item of list) {
        if (item instanceof cst.IdentifierOrParameterContext) {
          const node = this.createIdentifierOrParam(item);

          if (node) {
            args.push(node);
          }
        }
      }
    } else {
      const name = this.sanitizeIdentifierString(ctx);
      const node = Builder.identifier({ name }, this.createParserFields(ctx));

      args.push(node);
    }

    const text = this.sanitizeIdentifierString(ctx);
    const hasQuotes = Boolean(this.getQuotedText(ctx) || this.isQuoted(ctx.getText()));
    const column = Builder.expression.column(
      { args },
      {
        text: ctx.getText(),
        location: getPosition(ctx.start, ctx.stop),
        incomplete: Boolean(ctx.exception || text === ''),
      }
    );

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
      parserFields
    );

    node.name = text;

    return node;
  }

  private getQuotedText(ctx: antlr.ParserRuleContext) {
    return [27 /* esql_parser.QUOTED_STRING */, 69 /* esql_parser.QUOTED_IDENTIFIER */]
      .map((keyCode) => ctx.getToken(keyCode, 0))
      .filter(nonNullable)[0];
  }

  private isQuoted(text: string | undefined) {
    return text && /^(`)/.test(text);
  }

  // --------------------------------------------------- expression: "function"

  private createFunctionCall(ctx: cst.FunctionContext): ast.ESQLFunctionCallExpression {
    const functionExpressionCtx = ctx.functionExpression();
    const functionName = functionExpressionCtx.functionName();
    const node: ast.ESQLFunctionCallExpression = {
      type: 'function',
      subtype: 'variadic-call',
      name: functionName.getText().toLowerCase(),
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      args: [],
      incomplete: Boolean(ctx.exception),
    };

    const identifierOrParameter = functionName.identifierOrParameter();

    if (identifierOrParameter instanceof cst.IdentifierOrParameterContext) {
      const operator = this.createIdentifierOrParam(identifierOrParameter);

      if (operator) {
        node.operator = operator;
      }
    }

    return node;
  }

  private createFunction<Subtype extends ast.FunctionSubtype>(
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

  private createBinaryExpression(
    operator: ast.BinaryExpressionOperator,
    ctx: antlr.ParserRuleContext,
    args: ast.ESQLBinaryExpression['args']
  ): ast.ESQLBinaryExpression {
    const node = Builder.expression.func.binary(
      operator,
      args,
      {},
      {
        text: ctx.getText(),
        location: getPosition(ctx.start, ctx.stop),
        incomplete: Boolean(ctx.exception),
      }
    ) as ast.ESQLBinaryExpression;

    return node;
  }

  // -------------------------------------------------------- expression: "map"

  private fromMapExpression(ctx: cst.MapExpressionContext): ast.ESQLMap {
    const map = Builder.expression.map(
      {},
      {
        location: getPosition(ctx.start, ctx.stop),
        incomplete: Boolean(ctx.exception),
      }
    );
    const entryCtxs = ctx.entryExpression_list();

    for (const entryCtx of entryCtxs) {
      const entry = this.fromMapEntryExpression(entryCtx);

      map.entries.push(entry);
    }

    return map;
  }

  private fromMapEntryExpression(ctx: cst.EntryExpressionContext): ast.ESQLMapEntry {
    const keyCtx = ctx._key;
    const valueCtx = ctx._value;
    const key = this.createLiteralString(keyCtx) as ast.ESQLStringLiteral;
    const value = this.fromConstant(valueCtx) as ast.ESQLAstExpression;
    const entry = Builder.expression.entry(key, value, {
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    });

    return entry;
  }

  // ----------------------------------------------------- constant expressions

  /**
   * @todo Make return type more specific.
   */
  private fromConstant(ctx: cst.ConstantContext): ast.ESQLAstItem {
    if (ctx instanceof cst.NullLiteralContext) {
      return this.toLiteral('null', ctx.NULL());
    } else if (ctx instanceof cst.QualifiedIntegerLiteralContext) {
      return this.fromQualifiedIntegerLiteral(ctx);
    } else if (ctx instanceof cst.DecimalLiteralContext) {
      return this.toNumericLiteral(ctx.decimalValue(), 'double');
    } else if (ctx instanceof cst.IntegerLiteralContext) {
      return this.toNumericLiteral(ctx.integerValue(), 'integer');
    } else if (ctx instanceof cst.BooleanLiteralContext) {
      return this.getBooleanValue(ctx);
    } else if (ctx instanceof cst.StringLiteralContext) {
      return this.createLiteralString(ctx.string_());
    } else if (
      ctx instanceof cst.NumericArrayLiteralContext ||
      ctx instanceof cst.BooleanArrayLiteralContext ||
      ctx instanceof cst.StringArrayLiteralContext
    ) {
      return this.toList(ctx);
    } else if (ctx instanceof cst.InputParameterContext && ctx.children) {
      // TODO: Make a method out of this.
      const values: ast.ESQLLiteral[] = [];

      for (const child of ctx.children) {
        const param = this.toParam(child);
        if (param) values.push(param);
      }

      return values;
    }

    return this.fromParserRuleToUnknown(ctx);
  }

  // ------------------------------------------- constant expression: "literal"

  private toLiteral(
    type: ast.ESQLLiteral['literalType'],
    node: antlr.TerminalNode | null
  ): ast.ESQLLiteral {
    if (!node) {
      return {
        type: 'literal',
        name: 'unknown',
        text: 'unknown',
        value: 'unknown',
        literalType: type,
        location: { min: 0, max: 0 },
        incomplete: false,
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
      this.createParserFields(ctx)
    ) as Type extends 'double' ? ast.ESQLDecimalLiteral : ast.ESQLIntegerLiteral;
  }

  private createLiteralString(
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
      this.createParserFields(ctx)
    );
  }

  private toParam(ctx: antlr.ParseTree): ast.ESQLParam | undefined {
    if (ctx instanceof cst.InputParamContext || ctx instanceof cst.InputDoubleParamsContext) {
      const isDoubleParam = ctx instanceof cst.InputDoubleParamsContext;
      const paramKind: ast.ESQLParamKinds = isDoubleParam ? '??' : '?';

      return Builder.param.unnamed(this.createParserFields(ctx), { paramKind });
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
      const parserFields = this.createParserFields(ctx);

      if (isPositional) {
        return Builder.param.positional({ paramKind, value: valueAsNumber }, parserFields);
      } else {
        return Builder.param.named({ paramKind, value }, parserFields);
      }
    }
  }

  // ---------------------------------------------- constant expression: "list"

  private toList(
    ctx:
      | cst.NumericArrayLiteralContext
      | cst.BooleanArrayLiteralContext
      | cst.StringArrayLiteralContext
  ): ast.ESQLList {
    const values: ast.ESQLLiteral[] = [];

    for (const numericValue of ctx.getTypedRuleContexts(cst.NumericValueContext)) {
      const isDecimal =
        numericValue.decimalValue() !== null && numericValue.decimalValue() !== undefined;
      const value = numericValue.decimalValue() || numericValue.integerValue();
      values.push(this.toNumericLiteral(value!, isDecimal ? 'double' : 'integer'));
    }
    for (const booleanValue of ctx.getTypedRuleContexts(cst.BooleanValueContext)) {
      values.push(this.getBooleanValue(booleanValue)!);
    }
    for (const string of ctx.getTypedRuleContexts(cst.StringContext)) {
      const literal = this.createLiteralString(string);

      values.push(literal);
    }

    return Builder.expression.list.literal({ values }, this.createParserFields(ctx));
  }

  // -------------------------------------- constant expression: "timeInterval"

  private fromQualifiedIntegerLiteral(
    ctx: cst.QualifiedIntegerLiteralContext
  ): ast.ESQLTimeInterval {
    const value = ctx.integerValue().INTEGER_LITERAL().getText();
    const unit = ctx.UNQUOTED_IDENTIFIER().symbol.text;

    return {
      type: 'timeInterval',
      quantity: Number(value),
      unit,
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      name: value + ' ' + unit,
      incomplete: Boolean(ctx.exception),
    };
  }

  // ---------------------------------------- constant expression: "identifier"

  private createIdentifierOrParam(ctx: cst.IdentifierOrParameterContext) {
    const identifier = ctx.identifier();

    if (identifier) {
      return this.createIdentifier(identifier);
    }

    const parameter = ctx.parameter() ?? ctx.doubleParameter();

    if (parameter) {
      return this.toParam(parameter);
    }
  }

  private createIdentifier(identifier: cst.IdentifierContext): ast.ESQLIdentifier {
    const text = identifier.getText();
    const name = parseIdentifier(text);

    return Builder.identifier({ name }, this.createParserFields(identifier));
  }
}
