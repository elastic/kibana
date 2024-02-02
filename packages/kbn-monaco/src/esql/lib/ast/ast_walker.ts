/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ParserRuleContext } from 'antlr4ts/ParserRuleContext';
import {
  ArithmeticBinaryContext,
  ArithmeticUnaryContext,
  BooleanArrayLiteralContext,
  BooleanDefaultContext,
  type BooleanExpressionContext,
  BooleanLiteralContext,
  BooleanValueContext,
  type CommandOptionsContext,
  ComparisonContext,
  type ComparisonOperatorContext,
  type ConstantContext,
  ConstantDefaultContext,
  DecimalLiteralContext,
  DereferenceContext,
  type DissectCommandContext,
  type DropCommandContext,
  type EnrichCommandContext,
  esql_parser,
  type FieldContext,
  type FieldsContext,
  type FromCommandContext,
  FunctionContext,
  type GrokCommandContext,
  IntegerLiteralContext,
  IsNullContext,
  type KeepCommandContext,
  LogicalBinaryContext,
  LogicalInContext,
  LogicalNotContext,
  MetadataContext,
  MvExpandCommandContext,
  NullLiteralContext,
  NumericArrayLiteralContext,
  NumericValueContext,
  type OperatorExpressionContext,
  OperatorExpressionDefaultContext,
  type OrderExpressionContext,
  ParenthesizedExpressionContext,
  type PrimaryExpressionContext,
  QualifiedIntegerLiteralContext,
  RegexBooleanExpressionContext,
  type RenameClauseContext,
  type StatsCommandContext,
  StringArrayLiteralContext,
  StringContext,
  StringLiteralContext,
  type ValueExpressionContext,
  ValueExpressionDefaultContext,
  FromIdentifierContext,
} from '../../antlr/esql_parser';
import {
  createSource,
  createColumn,
  createOption,
  nonNullable,
  createFunction,
  createLiteral,
  createTimeUnit,
  createFakeMultiplyLiteral,
  createList,
  createNumericLiteral,
  sanifyIdentifierString,
  computeLocationExtends,
  createColumnStar,
  wrapIdentifierAsArray,
  createPolicy,
  createSettingTuple,
  createLiteralString,
  isMissingText,
} from './ast_helpers';
import { getPosition } from './ast_position_utils';
import type {
  ESQLLiteral,
  ESQLColumn,
  ESQLFunction,
  ESQLCommandOption,
  ESQLAstItem,
} from './types';

export function collectAllSourceIdentifiers(ctx: FromCommandContext): ESQLAstItem[] {
  return ctx.getRuleContexts(FromIdentifierContext).map((sourceCtx) => createSource(sourceCtx));
}

function extractIdentifiers(
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataContext
) {
  if (ctx instanceof MetadataContext) {
    return wrapIdentifierAsArray(ctx.fromIdentifier());
  }
  if (ctx instanceof MvExpandCommandContext) {
    return wrapIdentifierAsArray(ctx.qualifiedName());
  }
  return wrapIdentifierAsArray(ctx.qualifiedNamePattern());
}

function makeColumnsOutOfIdentifiers(identifiers: ParserRuleContext[]) {
  const args: ESQLColumn[] =
    identifiers
      .filter((child) => child.text)
      .map((sourceContext) => {
        return createColumn(sourceContext);
      }) ?? [];
  return args;
}

export function collectAllColumnIdentifiers(
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataContext
): ESQLAstItem[] {
  const identifiers = extractIdentifiers(ctx);
  return makeColumnsOutOfIdentifiers(identifiers);
}

export function getPolicyName(ctx: EnrichCommandContext) {
  if (!ctx._policyName || (ctx._policyName.text && /<missing /.test(ctx._policyName.text))) {
    return [];
  }
  return [createPolicy(ctx._policyName)];
}

export function getPolicySettings(ctx: EnrichCommandContext) {
  if (!ctx.setting() || !ctx.setting().length) {
    return [];
  }
  return ctx.setting().map((setting) => {
    const node = createSettingTuple(setting);
    if (setting._name?.text && setting._value?.text) {
      node.args.push(createLiteralString(setting._value)!);
      return node;
    }
    // incomplete setting
    return node;
  });
}

export function getMatchField(ctx: EnrichCommandContext) {
  if (!ctx._matchField) {
    return [];
  }
  const identifier = ctx.qualifiedNamePattern();
  if (identifier) {
    const fn = createOption(ctx.ON()!.text.toLowerCase(), ctx);
    if (identifier.text) {
      fn.args.push(createColumn(identifier));
    }
    // overwrite the location inferring the correct position
    fn.location = getPosition(ctx.ON()!.symbol, ctx.WITH()?.symbol);
    return [fn];
  }
  return [];
}

export function getEnrichClauses(ctx: EnrichCommandContext) {
  const ast: ESQLCommandOption[] = [];
  if (ctx.WITH()) {
    const option = createOption(ctx.WITH()!.text.toLowerCase(), ctx);
    ast.push(option);
    const clauses = ctx.enrichWithClause();
    for (const clause of clauses) {
      if (clause._enrichField) {
        const args = [
          // if an explicit assign is not set, create a fake assign with
          // both left and right value with the same column
          clause.ASSIGN() ? createColumn(clause._newName) : createColumn(clause._enrichField),
          createColumn(clause._enrichField),
        ].filter(nonNullable);
        if (args.length) {
          const fn = createFunction('=', clause);
          fn.args.push(args[0], [args[1]]);
          option.args.push(fn);
        }
      }
    }
    option.location = getPosition(ctx.WITH()?.symbol);
  }

  return ast;
}

function visitLogicalNot(ctx: LogicalNotContext) {
  const fn = createFunction('not', ctx);
  fn.args.push(...collectBooleanExpression(ctx.booleanExpression()));
  // update the location of the assign based on arguments
  const argsLocationExtends = computeLocationExtends(fn);
  fn.location = argsLocationExtends;
  return fn;
}

function visitLogicalAndsOrs(ctx: LogicalBinaryContext) {
  const fn = createFunction(ctx.AND() ? 'and' : 'or', ctx);
  fn.args.push(...collectBooleanExpression(ctx._left), ...collectBooleanExpression(ctx._right));
  // update the location of the assign based on arguments
  const argsLocationExtends = computeLocationExtends(fn);
  fn.location = argsLocationExtends;
  return fn;
}

function visitLogicalIns(ctx: LogicalInContext) {
  const fn = createFunction(ctx.NOT() ? 'not_in' : 'in', ctx);
  const [left, ...list] = ctx.valueExpression();
  const leftArg = visitValueExpression(left);
  if (leftArg) {
    fn.args.push(...(Array.isArray(leftArg) ? leftArg : [leftArg]));
    const values = list.map((ve) => visitValueExpression(ve));
    const listArgs = values
      .filter(nonNullable)
      .flatMap((arg) => (Array.isArray(arg) ? arg.filter(nonNullable) : arg));
    // distinguish between missing brackets (missing text error) and an empty list
    if (!isMissingText(ctx.text)) {
      fn.args.push(listArgs);
    }
  }
  // update the location of the assign based on arguments
  const argsLocationExtends = computeLocationExtends(fn);
  fn.location = argsLocationExtends;
  return fn;
}

function getMathOperation(ctx: ArithmeticBinaryContext) {
  return (
    ctx.PLUS()?.text ||
    ctx.MINUS()?.text ||
    ctx.ASTERISK()?.text ||
    ctx.SLASH()?.text ||
    ctx.PERCENT()?.text ||
    ''
  );
}

function getComparisonName(ctx: ComparisonOperatorContext) {
  return (
    ctx.EQ()?.text ||
    ctx.CIEQ()?.text ||
    ctx.NEQ()?.text ||
    ctx.LT()?.text ||
    ctx.LTE()?.text ||
    ctx.GT()?.text ||
    ctx.GTE()?.text ||
    ''
  );
}

function visitValueExpression(ctx: ValueExpressionContext) {
  if (isMissingText(ctx.text)) {
    return [];
  }
  if (ctx instanceof ValueExpressionDefaultContext) {
    return visitOperatorExpression(ctx.operatorExpression());
  }
  if (ctx instanceof ComparisonContext) {
    const comparisonNode = ctx.comparisonOperator();
    const comparisonFn = createFunction(getComparisonName(comparisonNode), comparisonNode);
    comparisonFn.args.push(
      visitOperatorExpression(ctx._left)!,
      visitOperatorExpression(ctx._right)!
    );
    // update the location of the comparisonFn based on arguments
    const argsLocationExtends = computeLocationExtends(comparisonFn);
    comparisonFn.location = argsLocationExtends;

    return comparisonFn;
  }
}

function visitOperatorExpression(
  ctx: OperatorExpressionContext
): ESQLAstItem | ESQLAstItem[] | undefined {
  if (ctx instanceof ArithmeticUnaryContext) {
    const arg = visitOperatorExpression(ctx.operatorExpression());
    // this is a number sign thing
    const fn = createFunction('multiply', ctx);
    fn.args.push(createFakeMultiplyLiteral(ctx));
    if (arg) {
      fn.args.push(arg);
    }
    return fn;
  }
  if (ctx instanceof ArithmeticBinaryContext) {
    const fn = createFunction(getMathOperation(ctx), ctx);
    const args = [visitOperatorExpression(ctx._left), visitOperatorExpression(ctx._right)];
    for (const arg of args) {
      if (arg) {
        fn.args.push(arg);
      }
    }
    // update the location of the assign based on arguments
    const argsLocationExtends = computeLocationExtends(fn);
    fn.location = argsLocationExtends;
    return fn;
  }
  if (ctx instanceof OperatorExpressionDefaultContext) {
    return visitPrimaryExpression(ctx.primaryExpression());
  }
}

function getBooleanValue(ctx: BooleanLiteralContext | BooleanValueContext) {
  const parentNode = ctx instanceof BooleanLiteralContext ? ctx.booleanValue() : ctx;
  const booleanTerminalNode = parentNode.TRUE() || parentNode.FALSE();
  return createLiteral('boolean', booleanTerminalNode!);
}

function getConstant(ctx: ConstantContext | undefined): ESQLAstItem | undefined {
  if (ctx instanceof NullLiteralContext) {
    return createLiteral('string', ctx.NULL());
  }
  if (ctx instanceof QualifiedIntegerLiteralContext) {
    // despite the generic name, this is a date unit constant:
    // e.g. 1 year, 15 months
    return createTimeUnit(ctx);
  }
  if (ctx instanceof DecimalLiteralContext) {
    return createNumericLiteral(ctx.decimalValue());
  }
  if (ctx instanceof IntegerLiteralContext) {
    return createNumericLiteral(ctx.integerValue());
  }
  if (ctx instanceof BooleanLiteralContext) {
    return getBooleanValue(ctx);
  }
  if (ctx instanceof StringLiteralContext) {
    return createLiteral('string', ctx.string().STRING());
  }
  if (
    ctx instanceof NumericArrayLiteralContext ||
    ctx instanceof BooleanArrayLiteralContext ||
    ctx instanceof StringArrayLiteralContext
  ) {
    const values: ESQLLiteral[] = [];
    for (const numericValue of ctx.getRuleContexts(NumericValueContext)) {
      const value = numericValue.decimalValue() || numericValue.integerValue();
      values.push(createNumericLiteral(value!));
    }
    for (const booleanValue of ctx.getRuleContexts(BooleanValueContext)) {
      values.push(getBooleanValue(booleanValue)!);
    }
    for (const string of ctx.getRuleContexts(StringContext)) {
      const literal = createLiteral('string', string.STRING());
      if (literal) {
        values.push(literal);
      }
    }
    return createList(ctx, values);
  }
}

export function visitRenameClauses(clausesCtx: RenameClauseContext[]): ESQLAstItem[] {
  return clausesCtx
    .map((clause) => {
      const asToken = clause.tryGetToken(esql_parser.AS, 0);
      if (asToken) {
        const fn = createOption(asToken.text.toLowerCase(), clause);
        for (const arg of [clause._oldName, clause._newName]) {
          if (arg?.text) {
            fn.args.push(createColumn(arg));
          }
        }
        return fn;
      } else if (clause._oldName?.text) {
        return createColumn(clause._oldName);
      }
    })
    .filter(nonNullable);
}

export function visitPrimaryExpression(
  ctx: PrimaryExpressionContext
): ESQLAstItem | ESQLAstItem[] | undefined {
  if (ctx instanceof ConstantDefaultContext) {
    return getConstant(ctx.constant());
  }
  if (ctx instanceof DereferenceContext) {
    return createColumn(ctx.qualifiedName());
  }
  if (ctx instanceof ParenthesizedExpressionContext) {
    return collectBooleanExpression(ctx.booleanExpression());
  }
  if (ctx instanceof FunctionContext) {
    const functionExpressionCtx = ctx.functionExpression();
    const fn = createFunction(functionExpressionCtx.identifier().text.toLowerCase(), ctx);
    const asteriskArg = functionExpressionCtx.ASTERISK()
      ? createColumnStar(functionExpressionCtx.ASTERISK()!)
      : undefined;
    if (asteriskArg) {
      fn.args.push(asteriskArg);
    }
    const functionArgs = functionExpressionCtx
      .booleanExpression()
      .flatMap(collectBooleanExpression)
      .filter(nonNullable);
    if (functionArgs.length) {
      fn.args.push(...functionArgs);
    }
    return fn;
  }
}

export function collectLogicalExpression(ctx: BooleanExpressionContext) {
  if (ctx instanceof LogicalNotContext) {
    return [visitLogicalNot(ctx)];
  }
  if (ctx instanceof LogicalBinaryContext) {
    return [visitLogicalAndsOrs(ctx)];
  }
  if (ctx instanceof LogicalInContext) {
    return [visitLogicalIns(ctx)];
  }
  return [];
}

function collectRegexExpression(ctx: BooleanExpressionContext): ESQLFunction[] {
  const regexes = ctx.getRuleContexts(RegexBooleanExpressionContext);
  const ret: ESQLFunction[] = [];
  return ret.concat(
    regexes.map((regex) => {
      const negate = regex.NOT();
      const likeType = regex._kind.text?.toLowerCase() || '';
      const fnName = `${negate ? 'not_' : ''}${likeType}`;
      const fn = createFunction(fnName, regex);
      const arg = visitValueExpression(regex.valueExpression());
      if (arg) {
        fn.args.push(arg);
        const literal = createLiteral('string', regex._pattern.STRING());
        if (literal) {
          fn.args.push(literal);
        }
      }
      return fn;
    })
  );
}

function collectIsNullExpression(ctx: BooleanExpressionContext) {
  if (!(ctx instanceof IsNullContext)) {
    return [];
  }
  const negate = ctx.NOT();
  const fnName = `${negate ? 'not_' : ''}is_null`;
  const fn = createFunction(fnName, ctx);
  const arg = visitValueExpression(ctx.valueExpression());
  if (arg) {
    fn.args.push(arg);
  }
  return [fn];
}

function collectDefaultExpression(ctx: BooleanExpressionContext) {
  if (!(ctx instanceof BooleanDefaultContext)) {
    return [];
  }
  const arg = visitValueExpression(ctx.valueExpression());
  return arg ? [arg] : [];
}

export function collectBooleanExpression(ctx: BooleanExpressionContext | undefined): ESQLAstItem[] {
  const ast: ESQLAstItem[] = [];
  if (!ctx) {
    return ast;
  }
  return ast.concat(
    collectLogicalExpression(ctx),
    collectRegexExpression(ctx),
    collectIsNullExpression(ctx),
    collectDefaultExpression(ctx)
  );
}

export function visitField(ctx: FieldContext) {
  if (ctx.qualifiedName() && ctx.ASSIGN()) {
    const fn = createFunction(ctx.ASSIGN()!.text, ctx);
    fn.args.push(
      createColumn(ctx.qualifiedName()!),
      collectBooleanExpression(ctx.booleanExpression())
    );
    // update the location of the assign based on arguments
    const argsLocationExtends = computeLocationExtends(fn);
    fn.location = argsLocationExtends;
    return [fn];
  }
  return collectBooleanExpression(ctx.booleanExpression());
}

export function collectAllFieldsStatements(ctx: FieldsContext | undefined): ESQLAstItem[] {
  const ast: ESQLAstItem[] = [];
  if (!ctx) {
    return ast;
  }
  try {
    for (const field of ctx.field()) {
      ast.push(...visitField(field));
    }
  } catch (e) {
    // do nothing
  }
  return ast;
}

export function visitByOption(ctx: StatsCommandContext, expr: FieldsContext | undefined) {
  if (!ctx.BY() || !expr) {
    return [];
  }
  const option = createOption(ctx.BY()!.text.toLowerCase(), ctx);
  option.args.push(...collectAllFieldsStatements(expr));
  return [option];
}

export function visitOrderExpression(ctx: OrderExpressionContext[]) {
  const ast = [];
  for (const orderCtx of ctx) {
    const expression = collectBooleanExpression(orderCtx.booleanExpression());
    if (orderCtx._ordering) {
      const terminalNode =
        orderCtx.tryGetToken(esql_parser.ASC, 0) || orderCtx.tryGetToken(esql_parser.DESC, 0);
      const literal = createLiteral('string', terminalNode);
      if (literal) {
        expression.push(literal);
      }
    }
    if (orderCtx.NULLS()) {
      expression.push(createLiteral('string', orderCtx.NULLS()!)!);
      if (orderCtx._nullOrdering) {
        const innerTerminalNode =
          orderCtx.tryGetToken(esql_parser.FIRST, 0) || orderCtx.tryGetToken(esql_parser.LAST, 0);
        const literal = createLiteral('string', innerTerminalNode);
        if (literal) {
          expression.push(literal);
        }
      }
    }

    if (expression.length) {
      ast.push(...expression);
    }
  }
  return ast;
}

export function visitDissect(ctx: DissectCommandContext) {
  const pattern = ctx.string().tryGetToken(esql_parser.STRING, 0);
  return [
    visitPrimaryExpression(ctx.primaryExpression()),
    ...(pattern && !isMissingText(pattern.text)
      ? [createLiteral('string', pattern), ...visitDissectOptions(ctx.commandOptions())]
      : []),
  ].filter(nonNullable);
}

export function visitGrok(ctx: GrokCommandContext) {
  const pattern = ctx.string().tryGetToken(esql_parser.STRING, 0);
  return [
    visitPrimaryExpression(ctx.primaryExpression()),
    ...(pattern && !isMissingText(pattern.text) ? [createLiteral('string', pattern)] : []),
  ].filter(nonNullable);
}

function visitDissectOptions(ctx: CommandOptionsContext | undefined) {
  if (!ctx) {
    return [];
  }
  const options: ESQLCommandOption[] = [];
  for (const optionCtx of ctx.commandOption()) {
    const option = createOption(
      sanifyIdentifierString(optionCtx.identifier()).toLowerCase(),
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
