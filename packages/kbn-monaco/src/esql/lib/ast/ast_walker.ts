/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException, ParserRuleContext, Token } from 'antlr4ts';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import {
  ArithmeticBinaryContext,
  ArithmeticUnaryContext,
  BooleanArrayLiteralContext,
  BooleanDefaultContext,
  BooleanExpressionContext,
  BooleanLiteralContext,
  BooleanValueContext,
  CommandOptionsContext,
  ComparisonContext,
  ComparisonOperatorContext,
  ConstantContext,
  ConstantDefaultContext,
  DecimalLiteralContext,
  DecimalValueContext,
  DereferenceContext,
  DissectCommandContext,
  DropCommandContext,
  EnrichCommandContext,
  esql_parser,
  FieldContext,
  FieldsContext,
  FromCommandContext,
  FunctionExpressionContext,
  GrokCommandContext,
  IntegerLiteralContext,
  IntegerValueContext,
  IsNullContext,
  KeepCommandContext,
  LogicalBinaryContext,
  LogicalInContext,
  LogicalNotContext,
  MetadataContext,
  MvExpandCommandContext,
  NullLiteralContext,
  NumericArrayLiteralContext,
  NumericValueContext,
  OperatorExpressionContext,
  OperatorExpressionDefaultContext,
  OrderExpressionContext,
  ParenthesizedExpressionContext,
  PrimaryExpressionContext,
  QualifiedIntegerLiteralContext,
  RegexBooleanExpressionContext,
  RenameClauseContext,
  SourceIdentifierContext,
  StatsCommandContext,
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

export function getPosition(token: Token | undefined, lastToken?: Token | undefined) {
  if (!token || token.startIndex < 0) {
    return { min: 0, max: 0 };
  }
  const endFirstToken =
    token.stopIndex > -1 ? Math.max(token.stopIndex + 1, token.startIndex) : undefined;
  const endLastToken = lastToken?.stopIndex;
  return {
    min: token.startIndex,
    max: endLastToken ?? endFirstToken ?? Infinity,
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
  return ctx.getRuleContexts(SourceIdentifierContext).map((sourceCtx) => createSource(sourceCtx));
}

export function collectAllColumnIdentifiers(
  ctx: KeepCommandContext | DropCommandContext | MvExpandCommandContext | MetadataContext
): ESQLAstItem[] {
  const identifiers = (
    Array.isArray(ctx.sourceIdentifier()) ? ctx.sourceIdentifier() : [ctx.sourceIdentifier()]
  ) as SourceIdentifierContext[];
  const args: ESQLColumn[] =
    identifiers
      .filter((child) => child.text)
      .map((sourceContext) => {
        return createColumn(sourceContext);
      }) ?? [];
  return args;
}

export function getPolicyName(ctx: EnrichCommandContext) {
  if (!ctx._policyName) {
    return [];
  }
  return [createSource(ctx._policyName, 'policy')];
}

export function getMatchField(ctx: EnrichCommandContext) {
  if (!ctx._matchField) {
    return [];
  }
  const identifier = ctx.sourceIdentifier(1);
  if (identifier) {
    const fn = createOption('on', ctx);
    if (identifier.text) {
      fn.args.push(createColumn(identifier));
    }
    return [fn];
  }
  return [];
}

export function getEnrichClauses(ctx: EnrichCommandContext) {
  const ast: ESQLCommandOption[] = [];
  if (ctx.WITH()) {
    const option = createOption(ctx.WITH()!.text, ctx);
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
  }

  return ast;
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
      const filteredArgs = Array.isArray(arg) ? arg.filter(nonNullable) : [arg];
      fn.args.push(filteredArgs);
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
        fn.args.push(createColumn(clause._oldName), createColumn(clause._newName));
        return fn;
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

export function visitByOption(ctx: StatsCommandContext) {
  if (!ctx.BY()) {
    return [];
  }
  const option = createOption(ctx.BY()!.text, ctx);
  for (const qnCtx of ctx.grouping()?.qualifiedName() || []) {
    option.args.push(createColumn(qnCtx));
  }
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
    createLiteral('string', pattern),
    ...visitDissectOptions(ctx.commandOptions()),
  ].filter(nonNullable);
}

export function visitGrok(ctx: GrokCommandContext) {
  const pattern = ctx.string().tryGetToken(esql_parser.STRING, 0);
  return [visitPrimaryExpression(ctx.primaryExpression()), createLiteral('string', pattern)].filter(
    nonNullable
  );
}

function visitDissectOptions(ctx: CommandOptionsContext | undefined) {
  if (!ctx) {
    return [];
  }
  const options: ESQLCommandOption[] = [];
  for (const optionCtx of ctx.commandOption()) {
    const option = createOption(sanifyIdentifierString(optionCtx.identifier()), optionCtx);
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

export function createError(exception: RecognitionException) {
  const token = exception.getOffendingToken();
  if (token) {
    const expectedSymbols = getExpectedSymbols(exception.expectedTokens);
    if (
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
  }
  return {
    type: 'error' as const,
    text: token
      ? `SyntaxError: expected {${getExpectedSymbols(exception.expectedTokens).join(
          ', '
        )}} but found "${token.text}"`
      : '',
    location: getPosition(token),
  };
}

export function createCommand(name: string, ctx: ParserRuleContext): ESQLCommand {
  return {
    type: 'command',
    name,
    text: ctx.text,
    args: [],
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

function createList(ctx: ParserRuleContext, values: ESQLLiteral[]): ESQLList {
  return {
    type: 'list',
    name: ctx.text,
    values,
    text: ctx.text,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

function createNumericLiteral(ctx: DecimalValueContext | IntegerValueContext): ESQLLiteral {
  const text = ctx.text;
  return {
    type: 'literal',
    literalType: 'number',
    text,
    name: text,
    value: Number(text),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

function createFakeMultiplyLiteral(ctx: ArithmeticUnaryContext): ESQLLiteral {
  return {
    type: 'literal',
    literalType: 'number',
    text: ctx.text,
    name: ctx.text,
    value: ctx.PLUS() ? 1 : -1,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createLiteral(
  type: ESQLLiteral['literalType'],
  node: TerminalNode | undefined
): ESQLLiteral | undefined {
  if (!node) {
    return;
  }
  const text = node.text;
  return {
    type: 'literal',
    literalType: type,
    text,
    name: text,
    value: type === 'number' ? Number(text) : text,
    location: getPosition(node.symbol),
    incomplete: /<missing /.test(node.text),
  };
}

export function createTimeUnit(ctx: QualifiedIntegerLiteralContext): ESQLTimeInterval {
  return {
    type: 'timeInterval',
    quantity: Number(ctx.integerValue().text),
    unit: ctx.UNQUOTED_IDENTIFIER().text,
    text: ctx.text,
    location: getPosition(ctx.start, ctx.stop),
    name: `${ctx.integerValue().text} ${ctx.UNQUOTED_IDENTIFIER().text}`,
    incomplete: Boolean(ctx.exception),
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
    location: customPosition ?? getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(ctx.exception),
  };
}

function getQuotedText(ctx: ParserRuleContext) {
  return (
    ctx.tryGetToken(esql_parser.SRC_QUOTED_IDENTIFIER, 0) ||
    ctx.tryGetToken(esql_parser.QUOTED_IDENTIFIER, 0)
  );
}

function getUnquotedText(ctx: ParserRuleContext) {
  return (
    ctx.tryGetToken(esql_parser.SRC_UNQUOTED_IDENTIFIER, 0) ||
    ctx.tryGetToken(esql_parser.UNQUOTED_IDENTIFIER, 0)
  );
}

function sanifyIdentifierString(ctx: ParserRuleContext) {
  return getUnquotedText(ctx)?.text || getQuotedText(ctx)?.text.replace(/`/g, '') || ctx.text;
}

export function createSource(
  ctx: ParserRuleContext,
  type: 'index' | 'policy' = 'index'
): ESQLSource {
  const text = sanifyIdentifierString(ctx);
  return {
    type: 'source',
    name: text,
    sourceType: type,
    text,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception || text === ''),
  };
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const text = sanifyIdentifierString(ctx);
  return {
    type: 'column',
    name: text,
    text,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception || text === ''),
    quoted: Boolean(getQuotedText(ctx)),
  };
}

export function createOption(name: string, ctx: ParserRuleContext): ESQLCommandOption {
  return {
    type: 'option',
    name,
    text: ctx.text,
    location: getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(ctx.exception || ctx.children?.some((c) => c instanceof ErrorNode)),
  };
}
