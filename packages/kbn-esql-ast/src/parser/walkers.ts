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
  default as esql_parser,
  ArithmeticBinaryContext,
  ArithmeticUnaryContext,
  BooleanArrayLiteralContext,
  BooleanDefaultContext,
  type BooleanExpressionContext,
  BooleanLiteralContext,
  InputParameterContext,
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
  MetadataOptionContext,
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
  InlineCastContext,
  InputNamedOrPositionalParamContext,
  InputParamContext,
  IndexPatternContext,
  InlinestatsCommandContext,
} from '../antlr/esql_parser';
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
  sanitizeIdentifierString,
  computeLocationExtends,
  createColumnStar,
  wrapIdentifierAsArray,
  createPolicy,
  createSetting,
  textExistsAndIsValid,
  createInlineCast,
  createUnknownItem,
  createOrderExpression,
} from './factories';
import { getPosition } from './helpers';

import {
  ESQLLiteral,
  ESQLColumn,
  ESQLFunction,
  ESQLCommandOption,
  ESQLAstItem,
  ESQLAstField,
  ESQLInlineCast,
  ESQLUnnamedParamLiteral,
  ESQLPositionalParamLiteral,
  ESQLNamedParamLiteral,
  ESQLOrderExpression,
} from '../types';
import { firstItem, lastItem } from '../visitor/utils';

export function collectAllSourceIdentifiers(ctx: FromCommandContext): ESQLAstItem[] {
  const fromContexts = ctx.getTypedRuleContexts(IndexPatternContext);
  return fromContexts.map((sourceCtx) => createSource(sourceCtx));
}

function terminalNodeToParserRuleContext(node: TerminalNode): ParserRuleContext {
  const context = new ParserRuleContext();
  context.start = node.symbol;
  context.stop = node.symbol;
  context.children = [node];
  return context;
}
function extractIdentifiers(
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataOptionContext
) {
  if (ctx instanceof MetadataOptionContext) {
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
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataOptionContext
): ESQLAstItem[] {
  const identifiers = extractIdentifiers(ctx);
  return makeColumnsOutOfIdentifiers(identifiers);
}

export function getPolicyName(ctx: EnrichCommandContext) {
  if (!ctx._policyName || !textExistsAndIsValid(ctx._policyName.text)) {
    return [];
  }
  const policyComponents = ctx._policyName.text.split(':');
  if (policyComponents.length > 1) {
    const [setting, policyName] = policyComponents;
    return [createSetting(ctx._policyName, setting), createPolicy(ctx._policyName, policyName)];
  }
  return [createPolicy(ctx._policyName, policyComponents[0])];
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

function visitLogicalIns(ctx: LogicalInContext) {
  const fn = createFunction(ctx.NOT() ? 'not_in' : 'in', ctx, undefined, 'binary-expression');
  const [left, ...list] = ctx.valueExpression_list();
  const leftArg = visitValueExpression(left);
  if (leftArg) {
    fn.args.push(...(Array.isArray(leftArg) ? leftArg : [leftArg]));
    const values = list.map((ve) => visitValueExpression(ve));
    const listArgs = values
      .filter(nonNullable)
      .flatMap((arg) => (Array.isArray(arg) ? arg.filter(nonNullable) : arg));
    // distinguish between missing brackets (missing text error) and an empty list
    if (textExistsAndIsValid(ctx.getText())) {
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
    (ctx.PLUS() || ctx.MINUS() || ctx.ASTERISK() || ctx.SLASH() || ctx.PERCENT()).getText() || ''
  );
}

function getComparisonName(ctx: ComparisonOperatorContext) {
  return (ctx.EQ() || ctx.NEQ() || ctx.LT() || ctx.LTE() || ctx.GT() || ctx.GTE()).getText() || '';
}

function visitValueExpression(ctx: ValueExpressionContext) {
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
  }
  if (ctx instanceof ArithmeticBinaryContext) {
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

function getConstant(ctx: ConstantContext): ESQLAstItem {
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
    // String literal covers multiple ES|QL types: text and keyword types
    return createLiteral('keyword', ctx.string_().QUOTED_STRING());
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
      // String literal covers multiple ES|QL types: text and keyword types
      const literal = createLiteral('keyword', string.QUOTED_STRING());
      if (literal) {
        values.push(literal);
      }
    }
    return createList(ctx, values);
  }
  if (ctx instanceof InputParameterContext && ctx.children) {
    const values: ESQLLiteral[] = [];

    for (const child of ctx.children) {
      if (child instanceof InputParamContext) {
        const literal: ESQLUnnamedParamLiteral = {
          type: 'literal',
          literalType: 'param',
          paramType: 'unnamed',
          text: ctx.getText(),
          name: '',
          value: '',
          location: getPosition(ctx.start, ctx.stop),
          incomplete: Boolean(ctx.exception),
        };
        values.push(literal);
      } else if (child instanceof InputNamedOrPositionalParamContext) {
        const text = child.getText();
        const value = text.slice(1);
        const valueAsNumber = Number(value);
        const isPositional = String(valueAsNumber) === value;

        if (isPositional) {
          const literal: ESQLPositionalParamLiteral = {
            type: 'literal',
            literalType: 'param',
            paramType: 'positional',
            value: valueAsNumber,
            text,
            name: '',
            location: getPosition(ctx.start, ctx.stop),
            incomplete: Boolean(ctx.exception),
          };
          values.push(literal);
        } else {
          const literal: ESQLNamedParamLiteral = {
            type: 'literal',
            literalType: 'param',
            paramType: 'named',
            value,
            text,
            name: '',
            location: getPosition(ctx.start, ctx.stop),
            incomplete: Boolean(ctx.exception),
          };
          values.push(literal);
        }
      }
    }

    return values;
  }

  return createUnknownItem(ctx);
}

export function visitRenameClauses(clausesCtx: RenameClauseContext[]): ESQLAstItem[] {
  return clausesCtx
    .map((clause) => {
      const asToken = clause.getToken(esql_parser.AS, 0);
      if (asToken && textExistsAndIsValid(asToken.getText())) {
        const option = createOption(asToken.getText().toLowerCase(), clause);
        for (const arg of [clause._oldName, clause._newName]) {
          if (textExistsAndIsValid(arg.getText())) {
            option.args.push(createColumn(arg));
          }
        }
        const firstArg = firstItem(option.args);
        const lastArg = lastItem(option.args);
        const location = option.location;
        if (firstArg) location.min = firstArg.location.min;
        if (lastArg) location.max = lastArg.location.max;
        return option;
      } else if (textExistsAndIsValid(clause._oldName?.getText())) {
        return createColumn(clause._oldName);
      }
    })
    .filter(nonNullable);
}

export function visitPrimaryExpression(ctx: PrimaryExpressionContext): ESQLAstItem | ESQLAstItem[] {
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
    const fn = createFunction(
      functionExpressionCtx.identifierOrParameter().getText().toLowerCase(),
      ctx,
      undefined,
      'variadic-call'
    );
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
    return fn;
  }
  if (ctx instanceof InlineCastContext) {
    return collectInlineCast(ctx);
  }
  return createUnknownItem(ctx);
}

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
    regexes.map((regex) => {
      const negate = regex.NOT();
      const likeType = regex._kind.text?.toLowerCase() || '';
      const fnName = `${negate ? 'not_' : ''}${likeType}`;
      const fn = createFunction(fnName, regex, undefined, 'binary-expression');
      const arg = visitValueExpression(regex.valueExpression());
      if (arg) {
        fn.args.push(arg);
        const literal = createLiteral('keyword', regex._pattern.QUOTED_STRING());
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
  return ast
    .concat(
      collectLogicalExpression(ctx),
      collectRegexExpression(ctx),
      collectIsNullExpression(ctx),
      collectDefaultExpression(ctx)
    )
    .flat();
}

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

const visitOrderExpression = (ctx: OrderExpressionContext): ESQLOrderExpression | ESQLAstItem => {
  const arg = collectBooleanExpression(ctx.booleanExpression())[0];

  let order: ESQLOrderExpression['order'] = '';
  let nulls: ESQLOrderExpression['nulls'] = '';

  const ordering = ctx._ordering?.text?.toUpperCase();

  if (ordering) order = ordering as ESQLOrderExpression['order'];

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

  return createOrderExpression(ctx, arg, order, nulls);
};

export function visitOrderExpressions(
  ctx: OrderExpressionContext[]
): Array<ESQLOrderExpression | ESQLAstItem> {
  const ast: Array<ESQLOrderExpression | ESQLAstItem> = [];

  for (const orderCtx of ctx) {
    ast.push(visitOrderExpression(orderCtx));
  }

  return ast;
}

export function visitDissect(ctx: DissectCommandContext) {
  const pattern = ctx.string_().getToken(esql_parser.QUOTED_STRING, 0);
  return [
    visitPrimaryExpression(ctx.primaryExpression()),
    ...(pattern && textExistsAndIsValid(pattern.getText())
      ? [createLiteral('keyword', pattern), ...visitDissectOptions(ctx.commandOptions())]
      : []),
  ].filter(nonNullable);
}

export function visitGrok(ctx: GrokCommandContext) {
  const pattern = ctx.string_().getToken(esql_parser.QUOTED_STRING, 0);
  return [
    visitPrimaryExpression(ctx.primaryExpression()),
    ...(pattern && textExistsAndIsValid(pattern.getText())
      ? [createLiteral('keyword', pattern)]
      : []),
  ].filter(nonNullable);
}

function visitDissectOptions(ctx: CommandOptionsContext | undefined) {
  if (!ctx) {
    return [];
  }
  const options: ESQLCommandOption[] = [];
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
