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

import type { ParseTree, ParserRuleContext, RecognitionException, TerminalNode } from 'antlr4';
import {
  FunctionContext,
  IdentifierContext,
  IdentifierOrParameterContext,
  InputDoubleParamsContext,
  InputNamedOrPositionalDoubleParamsContext,
  InputNamedOrPositionalParamContext,
  InputParamContext,
  QualifiedNameContext,
  QualifiedNamePatternContext,
  StringContext,
  type ArithmeticUnaryContext,
} from '../antlr/esql_parser';
import { Builder, type AstNodeParserFields } from '../builder';
import type {
  BinaryExpressionOperator,
  ESQLAstBaseItem,
  ESQLAstItem,
  ESQLBinaryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLFunction,
  ESQLFunctionCallExpression,
  ESQLIdentifier,
  ESQLLiteral,
  ESQLLocation,
  ESQLNumericLiteral,
  ESQLNumericLiteralType,
  ESQLParamKinds,
  ESQLStringLiteral,
  FunctionSubtype,
} from '../types';
import { DOUBLE_TICKS_REGEX, SINGLE_BACKTICK, TICKS_REGEX } from './constants';
import { getPosition, parseIdentifier } from './helpers';

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

export function createFunction<Subtype extends FunctionSubtype>(
  name: string,
  ctx: ParserRuleContext,
  customPosition?: ESQLLocation,
  subtype?: Subtype,
  args: ESQLAstItem[] = [],
  incomplete?: boolean
): ESQLFunction<Subtype> {
  const node: ESQLFunction<Subtype> = {
    type: 'function',
    name,
    text: ctx.getText(),
    location: customPosition ?? getPosition(ctx.start, ctx.stop),
    args,
    incomplete: Boolean(ctx.exception) || !!incomplete,
  };
  if (subtype) {
    node.subtype = subtype;
  }
  return node;
}

export const createFunctionCall = (ctx: FunctionContext): ESQLFunctionCallExpression => {
  const functionExpressionCtx = ctx.functionExpression();
  const functionName = functionExpressionCtx.functionName();
  const node: ESQLFunctionCallExpression = {
    type: 'function',
    subtype: 'variadic-call',
    name: functionName.getText().toLowerCase(),
    text: ctx.getText(),
    location: getPosition(ctx.start, ctx.stop),
    args: [],
    incomplete: Boolean(ctx.exception),
  };

  const identifierOrParameter = functionName.identifierOrParameter();

  if (identifierOrParameter instanceof IdentifierOrParameterContext) {
    const operator = createIdentifierOrParam(identifierOrParameter);

    if (operator) {
      node.operator = operator;
    }
  }

  return node;
};

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

export const createIdentifierOrParam = (ctx: IdentifierOrParameterContext) => {
  const identifier = ctx.identifier();

  if (identifier) {
    return createIdentifier(identifier);
  }

  const parameter = ctx.parameter() ?? ctx.doubleParameter();

  if (parameter) {
    return createParam(parameter);
  }
};

export const createIdentifier = (identifier: IdentifierContext): ESQLIdentifier => {
  const text = identifier.getText();
  const name = parseIdentifier(text);

  return Builder.identifier({ name }, createParserFields(identifier));
};

export const createParam = (ctx: ParseTree) => {
  if (ctx instanceof InputParamContext || ctx instanceof InputDoubleParamsContext) {
    const isDoubleParam = ctx instanceof InputDoubleParamsContext;
    const paramKind: ESQLParamKinds = isDoubleParam ? '??' : '?';

    return Builder.param.unnamed(createParserFields(ctx), { paramKind });
  } else if (
    ctx instanceof InputNamedOrPositionalParamContext ||
    ctx instanceof InputNamedOrPositionalDoubleParamsContext
  ) {
    const isDoubleParam = ctx instanceof InputNamedOrPositionalDoubleParamsContext;
    const paramKind: ESQLParamKinds = isDoubleParam ? '??' : '?';
    const text = ctx.getText();
    const value = text.slice(isDoubleParam ? 2 : 1);
    const valueAsNumber = Number(value);
    const isPositional = String(valueAsNumber) === value;
    const parserFields = createParserFields(ctx);

    if (isPositional) {
      return Builder.param.positional({ paramKind, value: valueAsNumber }, parserFields);
    } else {
      return Builder.param.named({ paramKind, value }, parserFields);
    }
  }
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

// Note: do not import esql_parser or bundle size will grow up by ~500 kb
/**
 * Do not touch this piece of code as it is auto-generated by a script
 */

/* SCRIPT_MARKER_START */
function getQuotedText(ctx: ParserRuleContext) {
  return [27 /* esql_parser.QUOTED_STRING */, 69 /* esql_parser.QUOTED_IDENTIFIER */]
    .map((keyCode) => ctx.getToken(keyCode, 0))
    .filter(nonNullable)[0];
}

function getUnquotedText(ctx: ParserRuleContext) {
  return [68 /* esql_parser.UNQUOTED_IDENTIFIER */, 77 /* esql_parser.UNQUOTED_SOURCE */]
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

export function createColumn(ctx: ParserRuleContext): ESQLColumn {
  const args: ESQLColumn['args'] = [];

  if (ctx instanceof QualifiedNamePatternContext) {
    const list = ctx.identifierPattern_list();

    for (const identifierPattern of list) {
      const ID_PATTERN = identifierPattern.ID_PATTERN();

      if (ID_PATTERN) {
        const name = parseIdentifier(ID_PATTERN.getText());
        const node = Builder.identifier({ name }, createParserFields(identifierPattern));

        args.push(node);
      } else {
        const parameter = createParam(identifierPattern.parameter());

        if (parameter) {
          args.push(parameter);
        }
      }
    }
  } else if (ctx instanceof QualifiedNameContext) {
    const list = ctx.identifierOrParameter_list();

    for (const item of list) {
      if (item instanceof IdentifierOrParameterContext) {
        const node = createIdentifierOrParam(item);

        if (node) {
          args.push(node);
        }
      }
    }
  } else {
    const name = sanitizeIdentifierString(ctx);
    const node = Builder.identifier({ name }, createParserFields(ctx));

    args.push(node);
  }

  const text = sanitizeIdentifierString(ctx);
  const hasQuotes = Boolean(getQuotedText(ctx) || isQuoted(ctx.getText()));
  const column = Builder.expression.column(
    { args },
    {
      text: ctx.getText(),
      location: getPosition(ctx.start, ctx.stop),
      incomplete: Boolean(ctx.exception || text === ''),
    }
  );

  column.name = text;
  column.quoted = hasQuotes;

  return column;
}

export function createError(exception: RecognitionException) {
  const token = exception.offendingToken;

  return {
    type: 'error' as const,
    text: `SyntaxError: ${exception.message}`,
    location: getPosition(token),
  };
}
