/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * In case of changes in the grammar, this script should be updated: esql_update_ast_script.js
 */

import type { ParserRuleContext, RecognitionException, TerminalNode } from 'antlr4';
import { StringContext, type ArithmeticUnaryContext } from '../antlr/esql_parser';
import { Builder, type AstNodeParserFields } from '../builder';
import type {
  BinaryExpressionOperator,
  ESQLAstBaseItem,
  ESQLAstItem,
  ESQLBinaryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLFunction,
  ESQLLiteral,
  ESQLLocation,
  ESQLNumericLiteralType,
  ESQLStringLiteral,
  FunctionSubtype,
} from '../types';
import { getPosition } from './helpers';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function createAstBaseItem<Name = string>(
  name: Name,
  ctx: ParserRuleContext
): ESQLAstBaseItem<Name> {
  return {
    name,
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export const createParserFields = (ctx: ParserRuleContext): AstNodeParserFields => ({
  text: ctx.getText(),
  location: getPosition(ctx.start, ctx.stop),
  incomplete: Boolean(ctx.exception),
});

export const createCommand = <
  Name extends string,
  Cmd extends ESQLCommand<Name> = ESQLCommand<Name>
>(
  name: Name,
  ctx: ParserRuleContext,
  partial?: Partial<Cmd>
): Cmd => {
  const command = Builder.command({ name, args: [] }, createParserFields(ctx)) as Cmd;

  if (partial) {
    Object.assign(command, partial);
  }

  return command;
};

export function createFakeMultiplyLiteral(
  ctx: ArithmeticUnaryContext,
  literalType: ESQLNumericLiteralType
): ESQLLiteral {
  return {
    type: 'literal',
    literalType,
    text: ctx.getText(),
    name: ctx.getText(),
    value: ctx.PLUS() ? 1 : -1,
    location: getPosition(ctx.start, ctx.stop),
    incomplete: Boolean(ctx.exception),
  };
}

export function createLiteralString(
  ctx: Pick<StringContext, 'QUOTED_STRING'> & ParserRuleContext
): ESQLStringLiteral {
  const quotedString = ctx.QUOTED_STRING()?.getText() ?? '""';
  const isTripleQuoted = quotedString.startsWith('"""') && quotedString.endsWith('"""');
  let valueUnquoted = isTripleQuoted ? quotedString.slice(3, -3) : quotedString.slice(1, -1);

  if (!isTripleQuoted) {
    valueUnquoted = valueUnquoted
      .replace(/\\"/g, '"')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  return Builder.expression.literal.string(
    valueUnquoted,
    {
      name: quotedString,
    },
    createParserFields(ctx)
  );
}

function isMissingText(text: string) {
  return /<missing /.test(text);
}

export function textExistsAndIsValid(text: string | undefined): text is string {
  return !!(text && !isMissingText(text));
}

export const createBinaryExpression = (
  operator: BinaryExpressionOperator,
  ctx: ParserRuleContext,
  args: ESQLBinaryExpression['args']
): ESQLBinaryExpression => {
  const node = Builder.expression.func.binary(
    operator,
    args,
    {},
    {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception),
    }
  ) as ESQLBinaryExpression;

  return node;
};

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

export function createColumnStar(ctx: TerminalNode): ESQLColumn {
  const text = ctx.getText();
  const parserFields = {
    text,
    location: getPosition(ctx.symbol),
    incomplete: ctx.getText() === '',
    quoted: false,
  };
  const node = Builder.expression.column(
    { args: [Builder.identifier({ name: '*' }, parserFields)] },
    parserFields
  );

  node.name = text;

  return node;
}

export function createError(exception: RecognitionException) {
  const token = exception.offendingToken;

  return {
    type: 'error' as const,
    text: `SyntaxError: ${exception.message}`,
    location: getPosition(token),
  };
}
