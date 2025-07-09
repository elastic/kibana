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
import {
  computeLocationExtends,
  createColumn,
  createFunction,
  createIdentifierOrParam,
  createLiteralString,
  createOption,
  createUnknownItem,
  nonNullable,
  sanitizeIdentifierString,
  textExistsAndIsValid,
  visitSource,
} from './factories';
import {
  collectBooleanExpression,
  getConstant,
  visitPrimaryExpression,
  visitValueExpression,
} from './walkers';
import { getPosition } from './helpers';
import { firstItem, lastItem, resolveItem } from '../visitor/utils';
import type { Parser } from './parser';

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
      .map((sourceCtx) => visitSource(sourceCtx));

    command.args.push(...sources);

    if (metadataCtx && metadataCtx.METADATA()) {
      const name = metadataCtx.METADATA().getText().toLowerCase();
      const option = createOption(name, metadataCtx);
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
      const limitValue = getConstant(ctx.constant());
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

    const expressions = collectBooleanExpression(ctx.booleanExpression());

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

    const condition = collectBooleanExpression(booleanExpression)[0];
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

    const option = createOption(byCtx.getText().toLowerCase(), ctx);

    option.args.push(...this.fromFields(expr));
    option.location.min = byCtx.symbol.start;

    const lastArg = lastItem(option.args);

    if (lastArg) option.location.max = lastArg.location.max;

    return [option];
  }

  // -------------------------------------------------------------------- SORT

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
    const arg = collectBooleanExpression(ctx.booleanExpression())[0];

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

  // -------------------------------------------------------------------- DROP

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
          const renameFunction = createFunction(
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
              renameFunction.args.push(createColumn(arg));
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
          return createColumn(clause._oldName);
        }
      })
      .filter(nonNullable);
  }

  // ------------------------------------------------------------------ DISSECT

  private fromDissectCommand(ctx: cst.DissectCommandContext): ast.ESQLCommand<'dissect'> {
    const command = this.createCommand('dissect', ctx);
    const primaryExpression = visitPrimaryExpression(ctx.primaryExpression());
    const stringContext = ctx.string_();
    const pattern = stringContext.getToken(cst.default.QUOTED_STRING, 0);
    const doParseStringAndOptions = pattern && textExistsAndIsValid(pattern.getText());

    command.args.push(primaryExpression);

    if (doParseStringAndOptions) {
      const stringNode = createLiteralString(stringContext);

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
      const option = createOption(
        sanitizeIdentifierString(optionCtx.identifier()).toLowerCase(),
        optionCtx
      );
      options.push(option);
      // it can throw while accessing constant for incomplete commands, so try catch it
      try {
        const optionValue = getConstant(optionCtx.constant());
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
      const fn = createOption(ctx.ON()!.getText().toLowerCase(), ctx);
      let max: number = ctx.ON()!.symbol.stop;

      if (textExistsAndIsValid(identifier.getText())) {
        const column = createColumn(identifier);
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
      const option = createOption(withCtx.getText().toLowerCase(), ctx);
      const clauses = ctx.enrichWithClause_list();

      options.push(option);

      for (const clause of clauses) {
        if (clause._enrichField) {
          const args: ast.ESQLColumn[] = [];

          if (clause.ASSIGN()) {
            args.push(createColumn(clause._newName));
            if (textExistsAndIsValid(clause._enrichField?.getText())) {
              args.push(createColumn(clause._enrichField));
            }
          } else {
            // if an explicit assign is not set, create a fake assign with
            // both left and right value with the same column
            if (textExistsAndIsValid(clause._enrichField?.getText())) {
              args.push(createColumn(clause._enrichField), createColumn(clause._enrichField));
            }
          }
          if (args.length) {
            const fn = createFunction('=', clause, undefined, 'binary-expression');
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
          return createColumn(sourceContext);
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
      const fn = createFunction(ctx.ASSIGN()!.getText(), ctx, undefined, 'binary-expression');

      fn.args.push(
        createColumn(ctx.qualifiedName()!),
        collectBooleanExpression(ctx.booleanExpression())
      );
      fn.location = computeLocationExtends(fn);

      return [fn];
    }

    return collectBooleanExpression(ctx.booleanExpression());
  }
}
