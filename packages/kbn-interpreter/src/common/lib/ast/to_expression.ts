/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getType } from '../get_type';
import type { Ast, AstArgument, AstFunction, AstNode } from './ast';
import { isAst } from './ast';
import { patch } from './patch';

interface Options {
  /**
   * Node type.
   */
  type?: 'argument' | 'expression' | 'function';

  /**
   * Original expression to apply the new AST to.
   * At the moment, only arguments values changes are supported.
   */
  source?: string;
}

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

export function toExpression(ast: AstNode, options: string | Options = 'expression'): string {
  const { type, source } = typeof options === 'string' ? ({ type: options } as Options) : options;

  if (source && isAst(ast)) {
    return patch(source, ast);
  }

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
