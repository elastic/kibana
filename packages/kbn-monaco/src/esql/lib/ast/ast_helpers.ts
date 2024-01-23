/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * In case of changes in the grammar, this script should be updated: esql_update_ast_script.js
 */

import { Token } from 'antlr4ts';
import type { ParserRuleContext } from 'antlr4ts/ParserRuleContext';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import type {
  ArithmeticUnaryContext,
  DecimalValueContext,
  IntegerValueContext,
  QualifiedIntegerLiteralContext,
  SettingContext,
} from '../../antlr/esql_parser';
import { getPosition } from './ast_position_utils';
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
  ESQLAstItem,
  ESQLCommandMode,
} from './types';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
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

export function createLiteralString(token: Token): ESQLLiteral {
  const text = token.text!;
  return {
    type: 'literal',
    literalType: 'string',
    text,
    name: text,
    value: text,
    location: getPosition(token),
    incomplete: Boolean(token.text === ''),
  };
}

function isMissingText(text: string) {
  return /<missing /.test(text);
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
    incomplete: isMissingText(node.text),
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

function walkFunctionStructure(
  args: ESQLAstItem[],
  initialLocation: ESQLLocation,
  prop: 'min' | 'max',
  getNextItemIndex: (arg: ESQLAstItem[]) => number
) {
  let nextArg: ESQLAstItem | undefined = args[getNextItemIndex(args)];
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

export function computeLocationExtends(fn: ESQLFunction) {
  const location = fn.location;
  if (fn.args) {
    // get min location navigating in depth keeping the left/first arg
    location.min = walkFunctionStructure(fn.args, location, 'min', () => 0);
    // get max location navigating in depth keeping the right/last arg
    location.max = walkFunctionStructure(fn.args, location, 'max', (args) => args.length - 1);
  }
  return location;
}

// Note: do not import esql_parser or bundle size will grow up by ~500 kb
/**
 * Do not touch this piece of code as it is auto-generated by a script
 */

/* SCRIPT_MARKER_START */
function getQuotedText(ctx: ParserRuleContext) {
  return [66 /* esql_parser.QUOTED_IDENTIFIER */]
    .map((keyCode) => ctx.tryGetToken(keyCode, 0))
    .filter(nonNullable)[0];
}

function getUnquotedText(ctx: ParserRuleContext) {
  return [
    65 /* esql_parser.UNQUOTED_IDENTIFIER */, 71 /* esql_parser.FROM_UNQUOTED_IDENTIFIER */,
    75 /* esql_parser.UNQUOTED_ID_PATTERN */,
  ]
    .map((keyCode) => ctx.tryGetToken(keyCode, 0))
    .filter(nonNullable)[0];
}
/* SCRIPT_MARKER_END */

const TICKS_REGEX = /(`)/g;

function isQuoted(text: string | undefined) {
  return text && /^(`)/.test(text);
}

export function sanifyIdentifierString(ctx: ParserRuleContext) {
  return (
    getUnquotedText(ctx)?.text ||
    getQuotedText(ctx)?.text.replace(TICKS_REGEX, '') ||
    ctx.text.replace(TICKS_REGEX, '') // for some reason some quoted text is not detected correctly by the parser
  );
}

export function wrapIdentifierAsArray<T extends ParserRuleContext>(identifierCtx: T | T[]): T[] {
  return Array.isArray(identifierCtx) ? identifierCtx : [identifierCtx];
}

export function createSettingTuple(ctx: SettingContext): ESQLCommandMode {
  return {
    type: 'mode',
    name: ctx._name?.text || '',
    text: ctx.text!,
    location: getPosition(ctx.start, ctx.stop),
    incomplete:
      (ctx._name?.text ? isMissingText(ctx._name.text) : true) ||
      (ctx._value?.text ? isMissingText(ctx._value.text) : true),
    args: [],
  };
}

/**
 * In https://github.com/elastic/elasticsearch/pull/103949 the ENRICH policy name
 * changed from rule to token type so we need to handle this specifically
 */
export function createPolicy(token: Token): ESQLSource {
  return {
    type: 'source',
    name: token.text!,
    text: token.text!,
    sourceType: 'policy',
    location: getPosition(token),
    incomplete: false,
  };
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

export function createColumnStar(ctx: TerminalNode): ESQLColumn {
  return {
    type: 'column',
    name: ctx.text,
    text: ctx.text,
    location: getPosition(ctx.symbol),
    incomplete: ctx.text === '',
    quoted: false,
  };
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const text = sanifyIdentifierString(ctx);
  const hasQuotes = Boolean(getQuotedText(ctx) || isQuoted(ctx.text));
  return {
    type: 'column' as const,
    name: text,
    text: ctx.text,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception || text === ''),
    quoted: hasQuotes,
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
