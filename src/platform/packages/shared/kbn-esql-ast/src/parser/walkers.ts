/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParserRuleContext, TerminalNode } from 'antlr4';
import {
  ArithmeticBinaryContext,
  ArithmeticUnaryContext,
  BooleanArrayLiteralContext,
  BooleanDefaultContext,
  BooleanLiteralContext,
  BooleanValueContext,
  ComparisonContext,
  ConstantDefaultContext,
  DecimalLiteralContext,
  DereferenceContext,
  EntryExpressionContext,
  FunctionContext,
  InlineCastContext,
  InlinestatsCommandContext,
  InputParameterContext,
  IntegerLiteralContext,
  IsNullContext,
  LogicalBinaryContext,
  LogicalInContext,
  LogicalNotContext,
  MapExpressionContext,
  MatchBooleanExpressionContext,
  RegexBooleanExpressionContext,
  MatchExpressionContext,
  MetadataContext,
  MvExpandCommandContext,
  NullLiteralContext,
  NumericArrayLiteralContext,
  NumericValueContext,
  OperatorExpressionDefaultContext,
  ParenthesizedExpressionContext,
  QualifiedIntegerLiteralContext,
  StringArrayLiteralContext,
  StringContext,
  StringLiteralContext,
  ValueExpressionDefaultContext,
  default as esql_parser,
  type AggFieldsContext,
  type BooleanExpressionContext,
  type ComparisonOperatorContext,
  type ConstantContext,
  type DropCommandContext,
  type EnrichCommandContext,
  type FieldContext,
  type FieldsContext,
  type KeepCommandContext,
  type OperatorExpressionContext,
  type PrimaryExpressionContext,
  type RenameClauseContext,
  type StatsCommandContext,
  type ValueExpressionContext,
  LikeExpressionContext,
  RlikeExpressionContext,
} from '../antlr/esql_parser';
import {
  computeLocationExtends,
  createBinaryExpression,
  createColumn,
  createColumnStar,
  createFakeMultiplyLiteral,
  createFunction,
  createFunctionCall,
  createInlineCast,
  createList,
  createLiteral,
  createLiteralString,
  createNumericLiteral,
  createOption,
  createParam,
  createTimeUnit,
  createUnknownItem,
  nonNullable,
  textExistsAndIsValid,
  wrapIdentifierAsArray,
} from './factories';

import { Builder } from '../builder';
import {
  ESQLAstExpression,
  ESQLAstField,
  ESQLAstItem,
  ESQLBinaryExpression,
  ESQLColumn,
  ESQLCommandOption,
  ESQLFunction,
  ESQLInlineCast,
  ESQLList,
  ESQLLiteral,
  ESQLMap,
  ESQLMapEntry,
  ESQLStringLiteral,
  InlineCastingType,
} from '../types';
import { firstItem, lastItem, resolveItem } from '../visitor/utils';
import { getPosition } from './helpers';

function terminalNodeToParserRuleContext(node: TerminalNode): ParserRuleContext {
  const context = new ParserRuleContext();
  context.start = node.symbol;
  context.stop = node.symbol;
  context.children = [node];
  return context;
}
function extractIdentifiers(
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataContext
) {
  if (ctx instanceof MetadataContext) {
    return ctx
      .UNQUOTED_SOURCE_list()
      .map((node) => {
        return terminalNodeToParserRuleContext(node);
      })
      .flat();
  }
  if (ctx instanceof MvExpandCommandContext) {
    return wrapIdentifierAsArray(ctx.qualifiedName());
  }
  return wrapIdentifierAsArray(ctx.qualifiedNamePatterns().qualifiedNamePattern_list());
}

function makeColumnsOutOfIdentifiers(identifiers: ParserRuleContext[]) {
  const args: ESQLColumn[] =
    identifiers
      .filter((child) => textExistsAndIsValid(child.getText()))
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

export function getMatchField(ctx: EnrichCommandContext) {
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

export function getEnrichClauses(ctx: EnrichCommandContext) {
  const ast: ESQLCommandOption[] = [];
  const withCtx = ctx.WITH();
  if (withCtx) {
    const option = createOption(withCtx.getText().toLowerCase(), ctx);
    ast.push(option);
    const clauses = ctx.enrichWithClause_list();
    for (const clause of clauses) {
      if (clause._enrichField) {
        const args = [];
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

  return ast;
}

function visitLogicalNot(ctx: LogicalNotContext) {
  const fn = createFunction('not', ctx, undefined, 'unary-expression');
  fn.args.push(...collectBooleanExpression(ctx.booleanExpression()));
  // update the location of the assign based on arguments
  const argsLocationExtends = computeLocationExtends(fn);
  fn.location = argsLocationExtends;
  return fn;
}

function visitLogicalAndsOrs(ctx: LogicalBinaryContext) {
  const fn = createFunction(ctx.AND() ? 'and' : 'or', ctx, undefined, 'binary-expression');
  fn.args.push(...collectBooleanExpression(ctx._left), ...collectBooleanExpression(ctx._right));
  // update the location of the assign based on arguments
  const argsLocationExtends = computeLocationExtends(fn);
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
 */
const visitTuple = (
  ctxs: ValueExpressionContext[],
  leftParen?: TerminalNode,
  rightParen?: TerminalNode
): ESQLList => {
  const values: ESQLAstExpression[] = [];
  let incomplete = false;

  for (const elementCtx of ctxs) {
    const element = visitValueExpression(elementCtx);

    if (!element) {
      continue;
    }

    const resolved = resolveItem(element) as ESQLAstExpression;

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
};

const visitLogicalIns = (ctx: LogicalInContext) => {
  const [leftCtx, ...rightCtxs] = ctx.valueExpression_list();
  const left = resolveItem(
    visitValueExpression(leftCtx) ?? createUnknownItem(leftCtx)
  ) as ESQLAstExpression;
  const right = visitTuple(rightCtxs, ctx.LP(), ctx.RP());
  const expression = createFunction(
    ctx.NOT() ? 'not in' : 'in',
    ctx,
    { min: ctx.start.start, max: ctx.stop?.stop ?? ctx.RP().symbol.stop },
    'binary-expression',
    [left, right],
    left.incomplete || right.incomplete
  );

  return expression;
};

function getMathOperation(ctx: ArithmeticBinaryContext) {
  return (
    (ctx.PLUS() || ctx.MINUS() || ctx.ASTERISK() || ctx.SLASH() || ctx.PERCENT()).getText() || ''
  );
}

function getComparisonName(ctx: ComparisonOperatorContext) {
  return (ctx.EQ() || ctx.NEQ() || ctx.LT() || ctx.LTE() || ctx.GT() || ctx.GTE()).getText() || '';
}

export function visitValueExpression(ctx: ValueExpressionContext) {
  if (!textExistsAndIsValid(ctx.getText())) {
    return [];
  }
  if (ctx instanceof ValueExpressionDefaultContext) {
    return visitOperatorExpression(ctx.operatorExpression());
  }
  if (ctx instanceof ComparisonContext) {
    const comparisonNode = ctx.comparisonOperator();
    const comparisonFn = createFunction(
      getComparisonName(comparisonNode),
      comparisonNode,
      undefined,
      'binary-expression'
    );
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
    const fn = createFunction('*', ctx, undefined, 'binary-expression');
    fn.args.push(createFakeMultiplyLiteral(ctx, 'integer'));
    if (arg) {
      fn.args.push(arg);
    }
    return fn;
  } else if (ctx instanceof ArithmeticBinaryContext) {
    const fn = createFunction(getMathOperation(ctx), ctx, undefined, 'binary-expression');
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
  } else if (ctx instanceof OperatorExpressionDefaultContext) {
    return visitPrimaryExpression(ctx.primaryExpression());
  }
}

function getBooleanValue(ctx: BooleanLiteralContext | BooleanValueContext) {
  const parentNode = ctx instanceof BooleanLiteralContext ? ctx.booleanValue() : ctx;
  const booleanTerminalNode = parentNode.TRUE() || parentNode.FALSE();
  return createLiteral('boolean', booleanTerminalNode!);
}

export function getConstant(ctx: ConstantContext): ESQLAstItem {
  if (ctx instanceof NullLiteralContext) {
    return createLiteral('null', ctx.NULL());
  }
  if (ctx instanceof QualifiedIntegerLiteralContext) {
    // despite the generic name, this is a date unit constant:
    // e.g. 1 year, 15 months
    return createTimeUnit(ctx);
  }

  // Decimal type covers multiple ES|QL types: long, double, etc.
  if (ctx instanceof DecimalLiteralContext) {
    return createNumericLiteral(ctx.decimalValue(), 'double');
  }

  // Integer type encompasses integer
  if (ctx instanceof IntegerLiteralContext) {
    return createNumericLiteral(ctx.integerValue(), 'integer');
  }
  if (ctx instanceof BooleanLiteralContext) {
    return getBooleanValue(ctx);
  }
  if (ctx instanceof StringLiteralContext) {
    return createLiteralString(ctx.string_());
  }
  if (
    ctx instanceof NumericArrayLiteralContext ||
    ctx instanceof BooleanArrayLiteralContext ||
    ctx instanceof StringArrayLiteralContext
  ) {
    const values: ESQLLiteral[] = [];

    for (const numericValue of ctx.getTypedRuleContexts(NumericValueContext)) {
      const isDecimal =
        numericValue.decimalValue() !== null && numericValue.decimalValue() !== undefined;
      const value = numericValue.decimalValue() || numericValue.integerValue();
      values.push(createNumericLiteral(value!, isDecimal ? 'double' : 'integer'));
    }
    for (const booleanValue of ctx.getTypedRuleContexts(BooleanValueContext)) {
      values.push(getBooleanValue(booleanValue)!);
    }
    for (const string of ctx.getTypedRuleContexts(StringContext)) {
      const literal = createLiteralString(string);

      values.push(literal);
    }
    return createList(ctx, values);
  }
  if (ctx instanceof InputParameterContext && ctx.children) {
    const values: ESQLLiteral[] = [];

    for (const child of ctx.children) {
      const param = createParam(child);
      if (param) values.push(param);
    }

    return values;
  }

  return createUnknownItem(ctx);
}

export function visitRenameClauses(clausesCtx: RenameClauseContext[]): ESQLAstItem[] {
  return clausesCtx
    .map((clause) => {
      const asToken = clause.getToken(esql_parser.AS, 0);
      const assignToken = clause.getToken(esql_parser.ASSIGN, 0);

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

export function visitPrimaryExpression(ctx: PrimaryExpressionContext): ESQLAstItem | ESQLAstItem[] {
  if (ctx instanceof ConstantDefaultContext) {
    return getConstant(ctx.constant());
  } else if (ctx instanceof DereferenceContext) {
    return createColumn(ctx.qualifiedName());
  } else if (ctx instanceof ParenthesizedExpressionContext) {
    return collectBooleanExpression(ctx.booleanExpression());
  } else if (ctx instanceof FunctionContext) {
    const functionExpressionCtx = ctx.functionExpression();
    const fn = createFunctionCall(ctx);
    const asteriskArg = functionExpressionCtx.ASTERISK()
      ? createColumnStar(functionExpressionCtx.ASTERISK()!)
      : undefined;
    if (asteriskArg) {
      fn.args.push(asteriskArg);
    }
    const functionArgs = functionExpressionCtx
      .booleanExpression_list()
      .flatMap(collectBooleanExpression)
      .filter(nonNullable);

    if (functionArgs.length) {
      fn.args.push(...functionArgs);
    }

    const mapExpressionCtx = functionExpressionCtx.mapExpression();

    if (mapExpressionCtx) {
      const trailingMap = visitMapExpression(mapExpressionCtx);

      fn.args.push(trailingMap);
    }

    return fn;
  } else if (ctx instanceof InlineCastContext) {
    return collectInlineCast(ctx);
  }
  return createUnknownItem(ctx);
}

export const visitMapExpression = (ctx: MapExpressionContext): ESQLMap => {
  const map = Builder.expression.map(
    {},
    {
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    }
  );
  const entryCtxs = ctx.entryExpression_list();

  for (const entryCtx of entryCtxs) {
    const entry = visitMapEntryExpression(entryCtx);

    map.entries.push(entry);
  }

  return map;
};

export const visitMapEntryExpression = (ctx: EntryExpressionContext): ESQLMapEntry => {
  const keyCtx = ctx._key;
  const valueCtx = ctx._value;
  const key = createLiteralString(keyCtx) as ESQLStringLiteral;
  const value = getConstant(valueCtx) as ESQLAstExpression;
  const entry = Builder.expression.entry(key, value, {
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  });

  return entry;
};

function collectInlineCast(ctx: InlineCastContext): ESQLInlineCast {
  const primaryExpression = visitPrimaryExpression(ctx.primaryExpression());
  return createInlineCast(ctx, primaryExpression);
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
  const regexes = ctx.getTypedRuleContexts(RegexBooleanExpressionContext);
  const ret: ESQLFunction[] = [];
  return ret.concat(
    regexes
      .map((regex) => {
        if (regex instanceof RlikeExpressionContext || regex instanceof LikeExpressionContext) {
          const negate = regex.NOT();
          const likeType = regex instanceof RlikeExpressionContext ? 'rlike' : 'like';
          const fnName = `${negate ? 'not ' : ''}${likeType}`;
          const fn = createFunction(fnName, regex, undefined, 'binary-expression');
          const arg = visitValueExpression(regex.valueExpression());
          if (arg) {
            fn.args.push(arg);

            const literal = createLiteralString(regex.string_());

            fn.args.push(literal);
          }
          return fn;
        }
        return undefined;
      })
      .filter(nonNullable)
  );
}

function collectIsNullExpression(ctx: BooleanExpressionContext) {
  if (!(ctx instanceof IsNullContext)) {
    return [];
  }
  const negate = ctx.NOT();
  const fnName = `is${negate ? ' not ' : ' '}null`;
  const fn = createFunction(fnName, ctx, undefined, 'postfix-unary-expression');
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

  if (ctx instanceof MatchExpressionContext) {
    return [visitMatchExpression(ctx)];
  }

  return ast
    .concat(
      collectLogicalExpression(ctx),
      collectRegexExpression(ctx),
      collectIsNullExpression(ctx),
      collectDefaultExpression(ctx)
    )
    .flat();
}

type ESQLAstMatchBooleanExpression = ESQLColumn | ESQLBinaryExpression | ESQLInlineCast;

const visitMatchExpression = (ctx: MatchExpressionContext): ESQLAstMatchBooleanExpression => {
  return visitMatchBooleanExpression(ctx.matchBooleanExpression());
};

const visitMatchBooleanExpression = (
  ctx: MatchBooleanExpressionContext
): ESQLAstMatchBooleanExpression => {
  let expression: ESQLAstMatchBooleanExpression = createColumn(ctx.qualifiedName());
  const dataTypeCtx = ctx.dataType();
  const constantCtx = ctx.constant();

  if (dataTypeCtx) {
    expression = Builder.expression.inlineCast(
      {
        castType: dataTypeCtx.getText().toLowerCase() as InlineCastingType,
        value: expression,
      },
      {
        location: getPosition(ctx.start, dataTypeCtx.stop),
        incomplete: Boolean(ctx.exception),
      }
    );
  }

  if (constantCtx) {
    const constantExpression = getConstant(constantCtx);

    expression = createBinaryExpression(':', ctx, [expression, constantExpression]);
  }

  return expression;
};

export function visitField(ctx: FieldContext) {
  if (ctx.qualifiedName() && ctx.ASSIGN()) {
    const fn = createFunction(ctx.ASSIGN()!.getText(), ctx, undefined, 'binary-expression');
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

export function collectAllAggFields(ctx: AggFieldsContext | undefined): ESQLAstField[] {
  const ast: ESQLAstField[] = [];
  if (!ctx) {
    return ast;
  }
  try {
    for (const aggField of ctx.aggField_list()) {
      ast.push(...(visitField(aggField.field()) as ESQLAstField[]));
    }
  } catch (e) {
    // do nothing
  }
  return ast;
}

export function collectAllFields(ctx: FieldsContext | undefined): ESQLAstField[] {
  const ast: ESQLAstField[] = [];
  if (!ctx) {
    return ast;
  }
  try {
    for (const field of ctx.field_list()) {
      ast.push(...(visitField(field) as ESQLAstField[]));
    }
  } catch (e) {
    // do nothing
  }
  return ast;
}

export function visitByOption(
  ctx: StatsCommandContext | InlinestatsCommandContext,
  expr: FieldsContext | undefined
) {
  const byCtx = ctx.BY();
  if (!byCtx || !expr) {
    return [];
  }
  const option = createOption(byCtx.getText().toLowerCase(), ctx);
  option.args.push(...collectAllFields(expr));
  option.location.min = byCtx.symbol.start;
  const lastArg = lastItem(option.args);
  if (lastArg) option.location.max = lastArg.location.max;
  return [option];
}
