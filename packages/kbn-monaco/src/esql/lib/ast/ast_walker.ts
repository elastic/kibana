/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException, ParserRuleContext, Token } from 'antlr4ts';
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import {
  ArithmeticBinaryContext,
  ArithmeticUnaryContext,
  BooleanArrayLiteralContext,
  BooleanDefaultContext,
  BooleanExpressionContext,
  BooleanLiteralContext,
  BooleanValueContext,
  ComparisonContext,
  ComparisonOperatorContext,
  ConstantContext,
  ConstantDefaultContext,
  DecimalLiteralContext,
  DecimalValueContext,
  DereferenceContext,
  esql_parser,
  FieldsContext,
  FromCommandContext,
  FunctionExpressionContext,
  IntegerLiteralContext,
  IntegerValueContext,
  IsNullContext,
  LogicalBinaryContext,
  LogicalInContext,
  LogicalNotContext,
  NullLiteralContext,
  NumericArrayLiteralContext,
  NumericValueContext,
  OperatorExpressionContext,
  OperatorExpressionDefaultContext,
  ParenthesizedExpressionContext,
  PrimaryExpressionContext,
  QualifiedIntegerLiteralContext,
  RegexBooleanExpressionContext,
  SourceIdentifierContext,
  StringArrayLiteralContext,
  StringContext,
  StringLiteralContext,
  ValueExpressionContext,
  ValueExpressionDefaultContext,
} from '../../antlr/esql_parser';
import type {
  ESQLCommand,
  ESQLLiteral,
  ESQLSource,
  ESQLColumn,
  ESQLFunction,
  ESQLAst,
  ESQLCommandOption,
  ESQLAstItem,
  ESQLLocation,
  ESQLTimeInterval,
  ESQLList,
  ESQLSingleAstItem,
} from './types';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

const symbolsLookup: Record<number, string> = Object.entries(esql_parser)
  .filter(([k, v]) => typeof v === 'number' && !/RULE_/.test(k) && k.toUpperCase() === k)
  .reduce((memo, [k, v]: [string, number]) => {
    memo[v] = k;
    return memo;
  }, {} as Record<number, string>);

export function getPosition(token: Token | undefined) {
  if (!token || token.startIndex < 0) {
    return;
  }
  return {
    min: token.startIndex,
    max: token.stopIndex > -1 ? Math.max(token.stopIndex + 1, token.startIndex) : undefined,
  };
}

export function getExpectedSymbols(expectedTokens: RecognitionException['expectedTokens']) {
  const tokenIds = expectedTokens?.toIntegerList().toArray() || [];
  const list = [];
  for (const tokenId of tokenIds) {
    if (symbolsLookup[tokenId]) {
      list.push(symbolsLookup[tokenId]);
    } else if (tokenId === -1) {
      list.push('<EOF>');
    }
  }
  return list;
}

export function getParentCommand(ast: ESQLAst) {
  const node = ast[ast.length - 1];
  if (node.type === 'command') {
    return node;
  }
}

function isNodeType<T extends ESQLSingleAstItem['type']>(
  node: ESQLSingleAstItem,
  type: T
): node is Extract<ESQLSingleAstItem, { type: T }> {
  return node.type === type;
}

export function getLastArgIfType<T extends ESQLSingleAstItem['type']>(
  node: ESQLSingleAstItem | ESQLCommand,
  type: T
): Extract<ESQLSingleAstItem, { type: T }> | undefined {
  if (!('args' in node)) {
    return;
  }
  const lastNode = node.args[node.args.length - 1];
  if (lastNode && !Array.isArray(lastNode) && isNodeType<T>(lastNode, type)) {
    return lastNode;
  }
}

export function collectAllSourceIdentifiers(ctx: FromCommandContext): ESQLAstItem[] {
  const args: ESQLSource[] =
    ctx.children
      ?.filter((child) => child instanceof SourceIdentifierContext)
      .map((_, i) => {
        return createSource(ctx.sourceIdentifier(i));
      }) ?? [];
  return args;
}

function visitLogicalNot(ctx: LogicalNotContext) {
  const fn = createFunction('not', ctx);
  fn.args.push(...collectBooleanExpression(ctx.booleanExpression()));
  return fn;
}

function visitLogicalAndsOrs(ctx: LogicalBinaryContext) {
  const fn = createFunction(ctx.AND() ? 'and' : 'or', ctx);
  fn.args.push(...collectBooleanExpression(ctx._left), ...collectBooleanExpression(ctx._right));
  return fn;
}

function visitLogicalIns(ctx: LogicalInContext) {
  const fn = createFunction(ctx.NOT() ? 'not_in' : 'in', ctx);
  const [left, ...list] = ctx.valueExpression();
  const values = [visitValueExpression(left), list.map((ve) => visitValueExpression(ve))];
  for (const arg of values) {
    if (arg) {
      if ((Array.isArray(arg) && arg.every(nonNullable)) || !Array.isArray(arg)) {
        fn.args.push(arg);
      }
    }
  }
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
    ctx.NEQ()?.text ||
    ctx.LT()?.text ||
    ctx.LTE()?.text ||
    ctx.GT()?.text ||
    ctx.GTE()?.text ||
    ''
  );
}

function visitValueExpression(ctx: ValueExpressionContext) {
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

function getConstant(ctx: ConstantContext): ESQLAstItem | undefined {
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
  if (ctx instanceof NullLiteralContext) {
    return createLiteral('null', ctx.NULL());
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
      values.push(getBooleanValue(booleanValue));
    }
    for (const string of ctx.getRuleContexts(StringContext)) {
      values.push(createLiteral('string', string.STRING()));
    }
    return createList(ctx, values);
  }
}

function visitPrimaryExpression(
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
  if (ctx instanceof FunctionExpressionContext) {
    const fn = createFunction(ctx.identifier().text.toLowerCase(), ctx);
    const functionArgs = ctx
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
  const logicalNots = ctx.getRuleContexts(LogicalNotContext);
  const logicalAndsOrs = ctx.getRuleContexts(LogicalBinaryContext);
  const logicalIns = ctx.getRuleContexts(LogicalInContext);
  const ret: ESQLFunction[] = [];
  return ret.concat(
    logicalNots.map(visitLogicalNot),
    logicalAndsOrs.map(visitLogicalAndsOrs),
    logicalIns.map(visitLogicalIns)
  );
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

export function collectAllFieldsStatements(ctx: FieldsContext | undefined): ESQLAstItem[] {
  const ast: ESQLAstItem[] = [];
  if (!ctx) {
    return ast;
  }
  try {
    for (const field of ctx.field()) {
      if (field.qualifiedName() && field.ASSIGN()) {
        const fn = createFunction(field.ASSIGN()!.text, field);
        fn.args.push(
          createColumn(field.qualifiedName()!),
          collectBooleanExpression(field.booleanExpression())
        );
        ast.push(fn);
      } else {
        ast.push(collectBooleanExpression(field.booleanExpression()));
      }
    }
  } catch (e) {
    // do nothing
  }
  return ast;
}

export function createError(exception: RecognitionException) {
  const token = exception.getOffendingToken();
  const expectedSymbols = getExpectedSymbols(exception.expectedTokens);
  if (
    token &&
    ['ASTERISK', 'UNQUOTED_IDENTIFIER', 'QUOTED_IDENTIFIER'].every(
      (s, i) => expectedSymbols[i] === s
    )
  ) {
    return {
      type: 'error' as const,
      text: `Unknown column ${token.text}`,
      location: getPosition(token),
    };
  }
  return {
    type: 'error' as const,
    text: token
      ? `SyntaxError: expected {${getExpectedSymbols(exception.expectedTokens).join(
          ', '
        )}} but found "${token.text}"`
      : 'Unknown parsing error',
    location: getPosition(token),
  };
}

export function createCommand(name: string, ctx: ParserRuleContext): ESQLCommand {
  return {
    type: 'command' as const,
    name,
    text: ctx.text,
    args: [],
    location: getPosition(ctx.start),
  };
}

function createList(ctx: ParserRuleContext, values: ESQLLiteral[]): ESQLList {
  return {
    type: 'list',
    values,
    text: ctx.text,
    location: getPosition(ctx.start),
  };
}

function createNumericLiteral(ctx: DecimalValueContext | IntegerValueContext): ESQLLiteral {
  const text = ctx.text;
  return {
    type: 'literal' as const,
    literalType: 'number',
    text,
    value: Number(text),
    location: getPosition(ctx.start),
  };
}

function createFakeMultiplyLiteral(ctx: ArithmeticUnaryContext): ESQLLiteral {
  return {
    type: 'literal',
    literalType: 'number',
    text: ctx.text,
    value: ctx.PLUS() ? 1 : -1,
    location: getPosition(ctx.start),
  };
}

export function createLiteral(type: ESQLLiteral['literalType'], node: TerminalNode): ESQLLiteral {
  const text = node.text;
  return {
    type: 'literal' as const,
    literalType: type,
    text,
    value: Number(text),
    location: getPosition(node.symbol),
  };
}

export function createTimeUnit(ctx: QualifiedIntegerLiteralContext): ESQLTimeInterval {
  return {
    type: 'timeInterval',
    quantity: Number(ctx.integerValue().text),
    unit: ctx.UNQUOTED_IDENTIFIER().text,
    text: ctx.text,
    location: getPosition(ctx.start),
  };
}

export function createFunction(
  name: string,
  ctx: ParserRuleContext,
  customPosition?: ESQLLocation
): ESQLFunction {
  return {
    type: 'function',
    name,
    text: ctx.text,
    location: customPosition ?? getPosition(ctx.start),
    args: [],
  };
}

export function createSource(ctx: ParserRuleContext): ESQLSource {
  const text = ctx.text;
  return {
    type: 'source',
    name: text,
    text,
    location: getPosition(ctx.start),
  };
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const text = ctx.text;
  return {
    type: 'column',
    name: text,
    text,
    location: getPosition(ctx.start),
  };
}

export function createOption(name: string, ctx: ParserRuleContext): ESQLCommandOption {
  return {
    type: 'option',
    name,
    text: ctx.text,
    location: getPosition(ctx.start),
    args: [],
  };
}
