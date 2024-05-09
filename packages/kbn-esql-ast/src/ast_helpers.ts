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

import { type Token, type ParserRuleContext, type TerminalNode } from 'antlr4';
import type {
  ArithmeticUnaryContext,
  DecimalValueContext,
  IntegerValueContext,
  QualifiedIntegerLiteralContext,
} from './antlr/esql_parser';
import { getPosition } from './ast_position_utils';
import { DOUBLE_TICKS_REGEX, SINGLE_BACKTICK, TICKS_REGEX } from './constants';
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
    text: ctx.getText(),
    args: [],
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createList(ctx: ParserRuleContext, values: ESQLLiteral[]): ESQLList {
  return {
    type: 'list',
    name: ctx.getText(),
    values,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createNumericLiteral(ctx: DecimalValueContext | IntegerValueContext): ESQLLiteral {
  const text = ctx.getText();
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
    text: ctx.getText(),
    name: ctx.getText(),
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

export function textExistsAndIsValid(text: string | undefined): text is string {
  return !!(text && !isMissingText(text));
}

export function createLiteral(
  type: ESQLLiteral['literalType'],
  node: TerminalNode | undefined
): ESQLLiteral | undefined {
  if (!node) {
    return;
  }
  const text = node.getText();

  const partialLiteral: Omit<ESQLLiteral, 'literalType' | 'value'> = {
    type: 'literal',
    text,
    name: text,
    location: getPosition(node.symbol),
    incomplete: isMissingText(text),
  };
  if (type === 'number') {
    return {
      ...partialLiteral,
      literalType: type,
      value: Number(text),
    };
  }
  return {
    ...partialLiteral,
    literalType: type,
    value: text,
  };
}

export function createTimeUnit(ctx: QualifiedIntegerLiteralContext): ESQLTimeInterval {
  return {
    type: 'timeInterval',
    quantity: Number(ctx.integerValue().INTEGER_LITERAL().getText()),
    unit: ctx.UNQUOTED_IDENTIFIER().symbol.text,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    name: `${ctx.integerValue().INTEGER_LITERAL().getText()} ${
      ctx.UNQUOTED_IDENTIFIER().symbol.text
    }`,
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
    text: ctx.getText(),
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
    // in case of empty array as last arg, bump the max location by 3 chars (empty brackets)
    if (
      Array.isArray(fn.args[fn.args.length - 1]) &&
      !(fn.args[fn.args.length - 1] as ESQLAstItem[]).length
    ) {
      location.max += 3;
    }
  }
  return location;
}

// Note: do not import esql_parser or bundle size will grow up by ~500 kb
/**
 * Do not touch this piece of code as it is auto-generated by a script
 */

/* SCRIPT_MARKER_START */
function getQuotedText(ctx: ParserRuleContext) {
  return [27 /* esql_parser.QUOTED_STRING */, 68 /* esql_parser.QUOTED_IDENTIFIER */]
    .map((keyCode) => ctx.getToken(keyCode, 0))
    .filter(nonNullable)[0];
}

function getUnquotedText(ctx: ParserRuleContext) {
  return [67 /* esql_parser.UNQUOTED_IDENTIFIER */, 74 /* esql_parser.FROM_UNQUOTED_IDENTIFIER */]
    .map((keyCode) => ctx.getToken(keyCode, 0))
    .filter(nonNullable)[0];
}
/* SCRIPT_MARKER_END */

function isQuoted(text: string | undefined) {
  return text && /^(`)/.test(text);
}

/**
 * Follow a similar logic to the ES one:
 * * remove backticks at the beginning and at the end
 * * remove double backticks
 */
function safeBackticksRemoval(text: string | undefined) {
  return text?.replace(TICKS_REGEX, '').replace(DOUBLE_TICKS_REGEX, SINGLE_BACKTICK) || '';
}

export function sanitizeIdentifierString(ctx: ParserRuleContext) {
  const result =
    getUnquotedText(ctx)?.getText() ||
    safeBackticksRemoval(getQuotedText(ctx)?.getText()) ||
    safeBackticksRemoval(ctx.getText()); // for some reason some quoted text is not detected correctly by the parser

  // TODO - understand why <missing null> is now returned as the match text for the FROM command
  return result === '<missing null>' ? '' : result;
}

export function wrapIdentifierAsArray<T extends ParserRuleContext>(identifierCtx: T | T[]): T[] {
  return Array.isArray(identifierCtx) ? identifierCtx : [identifierCtx];
}

export function createSetting(policyName: Token, mode: string): ESQLCommandMode {
  return {
    type: 'mode',
    name: mode.replace('_', '').toLowerCase(),
    text: mode,
    location: getPosition(policyName, { stop: policyName.start + mode.length - 1 }), // unfortunately this is the only location we have
    incomplete: false,
  };
}

/**
 * In https://github.com/elastic/elasticsearch/pull/103949 the ENRICH policy name
 * changed from rule to token type so we need to handle this specifically
 */
export function createPolicy(token: Token, policy: string): ESQLSource {
  return {
    type: 'source',
    name: policy,
    text: policy,
    sourceType: 'policy',
    location: getPosition({
      start: token.stop - policy.length + 1,
      stop: token.stop,
    }), // take into account ccq modes
    incomplete: false,
  };
}

export function createSource(
  ctx: ParserRuleContext,
  type: 'index' | 'policy' = 'index'
): ESQLSource {
  const text = sanitizeIdentifierString(ctx);
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
    name: ctx.getText(),
    text: ctx.getText(),
    location: getPosition(ctx.symbol),
    incomplete: ctx.getText() === '',
    quoted: false,
  };
}

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const text = sanitizeIdentifierString(ctx);
  const hasQuotes = Boolean(getQuotedText(ctx) || isQuoted(ctx.getText()));
  return {
    type: 'column' as const,
    name: text,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception || text === ''),
    quoted: hasQuotes,
  };
}

export function createOption(name: string, ctx: ParserRuleContext): ESQLCommandOption {
  return {
    type: 'option',
    name,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(
      ctx.exception ||
        ctx.children?.some((c) => {
          // @ts-expect-error not exposed in type but exists see https://github.com/antlr/antlr4/blob/v4.11.1/runtime/JavaScript/src/antlr4/tree/ErrorNodeImpl.js#L19
          return Boolean(c.isErrorNode);
        })
    ),
  };
}
