/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getType } from './get_type';
import { parse } from './parse';

export type AstNode = Ast | AstFunction | AstArgument;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Ast = {
  type: 'expression';
  chain: AstFunction[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AstFunction = {
  type: 'function';
  function: string;
  arguments: Record<string, AstArgument[]>;
};

export type AstArgument = string | boolean | number | Ast;

function getArgumentString(arg: AstArgument, argKey?: string, level = 0): string {
  const type = getType(arg);

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function maybeArgKey(argKey: string | null | undefined, argString: string) {
    return argKey == null || argKey === '_' ? argString : `${argKey}=${argString}`;
  }

  if (type === 'string') {
    // correctly (re)escape double quotes
    const escapedArg = (arg as string).replace(/[\\"]/g, '\\$&'); // $& means the whole matched string
    return maybeArgKey(argKey, `"${escapedArg}"`);
  }

  if (type === 'boolean' || type === 'null' || type === 'number') {
    // use values directly
    return maybeArgKey(argKey, `${arg}`);
  }

  if (type === 'expression') {
    // build subexpressions
    return maybeArgKey(argKey, `{${getExpression((arg as Ast).chain, level + 1)}}`);
  }

  // unknown type, throw with type value
  throw new Error(`Invalid argument type in AST: ${type}`);
}

function getExpressionArgs({ arguments: args }: AstFunction, level = 0) {
  if (args == null || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Arguments can only be an object');
  }

  const argKeys = Object.keys(args);
  const MAX_LINE_LENGTH = 80; // length before wrapping arguments
  return argKeys.map((argKey) =>
    args[argKey].reduce((acc: string, arg) => {
      const argString = getArgumentString(arg, argKey, level);
      const lineLength = acc.split('\n').pop()!.length;

      // if arg values are too long, move it to the next line
      if (level === 0 && lineLength + argString.length > MAX_LINE_LENGTH) {
        return `${acc}\n  ${argString}`;
      }

      // append arg values to existing arg values
      if (lineLength > 0) {
        return `${acc} ${argString}`;
      }

      // start the accumulator with the first arg value
      return argString;
    }, '')
  );
}

function fnWithArgs(fnName: string, args: unknown[]) {
  return `${fnName} ${args?.join(' ') ?? ''}`.trim();
}

function getExpression(chain: AstFunction[], level = 0) {
  if (!chain) {
    throw new Error('Expressions must contain a chain');
  }

  // break new functions onto new lines if we're not in a nested/sub-expression
  const separator = level > 0 ? ' | ' : '\n| ';

  return chain
    .map((item) => {
      const type = getType(item);

      if (type !== 'function') {
        return;
      }

      const { function: fn } = item;
      if (!fn) {
        throw new Error('Functions must have a function name');
      }

      const expressionArgs = getExpressionArgs(item, level);

      return fnWithArgs(fn, expressionArgs);
    })
    .join(separator);
}

export function fromExpression(expression: string, type = 'expression'): Ast {
  try {
    return parse(String(expression), { startRule: type });
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}

// TODO: OMG This is so bad, we need to talk about the right way to handle bad expressions since some are element based and others not
export function safeElementFromExpression(expression: string) {
  try {
    return fromExpression(expression);
  } catch (e) {
    return fromExpression(
      `markdown
"## Crud.
Canvas could not parse this element's expression. I am so sorry this error isn't more useful. I promise it will be soon.

Thanks for understanding,
#### Management
"`
    );
  }
}

// TODO: Respect the user's existing formatting
export function toExpression(ast: AstNode, type = 'expression'): string {
  if (type === 'argument') {
    return getArgumentString(ast as AstArgument);
  }

  const nodeType = getType(ast);

  if (nodeType === 'expression') {
    const { chain } = ast as Ast;
    if (!Array.isArray(chain)) {
      throw new Error('Expressions must contain a chain');
    }

    return getExpression(chain);
  }

  if (nodeType === 'function') {
    const { function: fn } = ast as AstFunction;
    const args = getExpressionArgs(ast as AstFunction);

    return fnWithArgs(fn, args);
  }

  throw new Error('Expression must be an expression or argument function');
}
