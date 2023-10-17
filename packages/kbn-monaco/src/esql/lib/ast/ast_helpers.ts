/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ParserRuleContext, RecognitionException, Token } from 'antlr4ts';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import {
  ArithmeticUnaryContext,
  DecimalValueContext,
  esql_parser,
  IntegerValueContext,
  QualifiedIntegerLiteralContext,
} from '../../antlr/esql_parser';
import type {
  ESQLCommand,
  ESQLLiteral,
  ESQLList,
  ESQLTimeInterval,
  ESQLLocation,
  ESQLFunction,
  ESQLSource,
  ESQLColumn,
  ESQLCommandOption,
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

export function getExpectedSymbols(expectedTokens: RecognitionException['expectedTokens']) {
  const tokenIds = expectedTokens?.toIntegerList().toArray() || [];
  const list = [];
  for (const tokenId of tokenIds) {
    if (tokenId in symbolsLookup) {
      list.push(symbolsLookup[tokenId]);
    } else if (tokenId === -1) {
      list.push('<EOF>');
    }
  }
  return list;
}

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

export function createList(ctx: ParserRuleContext, values: ESQLLiteral[]): ESQLList {
  return {
    type: 'list',
    name: ctx.text,
    values,
    text: ctx.text,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createNumericLiteral(ctx: DecimalValueContext | IntegerValueContext): ESQLLiteral {
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

export function createFakeMultiplyLiteral(ctx: ArithmeticUnaryContext): ESQLLiteral {
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

export function sanifyIdentifierString(ctx: ParserRuleContext) {
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
