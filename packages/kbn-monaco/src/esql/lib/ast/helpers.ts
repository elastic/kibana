/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecognitionException, ParserRuleContext, Token } from 'antlr4ts';
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { esql_parser } from '../../antlr/esql_parser';
import type {
  ESQLCommand,
  ESQLLiteral,
  ESQLSource,
  ESQLColumn,
  ESQLVariable,
  ESQLFunction,
  ESQLAst,
  ESQLCommandOption,
  ESQLAstItem,
  ESQLLocation,
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

function isNodeType<T extends ESQLAstItem['type']>(
  node: ESQLAstItem,
  type: T
): node is Extract<ESQLAstItem, { type: T }> {
  return node.type === type;
}

export function getLastArgIfType<T extends ESQLAstItem['type']>(
  node: ESQLAstItem | ESQLCommand,
  type: T
): Extract<ESQLAstItem, { type: T }> | undefined {
  if (!('args' in node)) {
    return;
  }
  const lastNode = node.args[node.args.length - 1];
  if (lastNode && isNodeType<T>(lastNode, type)) {
    return lastNode;
  }
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

export function createLiteral(type: ESQLLiteral['literalType'], node: TerminalNode): ESQLLiteral {
  return {
    type: 'literal' as const,
    literalType: type,
    text: node.text,
    value: Number(node.text),
    location: getPosition(node.symbol),
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
  return {
    type: 'source',
    name: ctx.text,
    text: ctx.text,
    location: getPosition(ctx.start),
  };
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  return {
    type: 'column',
    name: ctx.text,
    text: ctx.text,
    location: getPosition(ctx.start),
  };
}

export function createVariable(ctx: ParserRuleContext): ESQLVariable {
  return {
    type: 'variable',
    name: ctx.text,
    text: ctx.text,
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
