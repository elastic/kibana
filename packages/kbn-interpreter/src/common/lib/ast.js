/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getType } from './get_type';
import { parse } from './grammar';

function getArgumentString(arg, argKey, level = 0) {
  const type = getType(arg);

  function maybeArgKey(argKey, argString) {
    return argKey == null || argKey === '_' ? argString : `${argKey}=${argString}`;
  }

  if (type === 'string') {
    // correctly (re)escape double quotes
    const escapedArg = arg.replace(/[\\"]/g, '\\$&'); // $& means the whole matched string
    return maybeArgKey(argKey, `"${escapedArg}"`);
  }

  if (type === 'boolean' || type === 'null' || type === 'number') {
    // use values directly
    return maybeArgKey(argKey, `${arg}`);
  }

  if (type === 'expression') {
    // build subexpressions
    return maybeArgKey(argKey, `{${getExpression(arg.chain, level + 1)}}`);
  }

  // unknown type, throw with type value
  throw new Error(`Invalid argument type in AST: ${type}`);
}

function getExpressionArgs(block, level = 0) {
  const args = block.arguments;
  const hasValidArgs = typeof args === 'object' && args != null && !Array.isArray(args);

  if (!hasValidArgs) throw new Error('Arguments can only be an object');

  const argKeys = Object.keys(args);
  const MAX_LINE_LENGTH = 80; // length before wrapping arguments
  return argKeys.map((argKey) =>
    args[argKey].reduce((acc, arg) => {
      const argString = getArgumentString(arg, argKey, level);
      const lineLength = acc.split('\n').pop().length;

      // if arg values are too long, move it to the next line
      if (level === 0 && lineLength + argString.length > MAX_LINE_LENGTH) {
        return `${acc}\n  ${argString}`;
      }

      // append arg values to existing arg values
      if (lineLength > 0) return `${acc} ${argString}`;

      // start the accumulator with the first arg value
      return argString;
    }, '')
  );
}

function fnWithArgs(fnName, args) {
  if (!args || args.length === 0) return fnName;
  return `${fnName} ${args.join(' ')}`;
}

function getExpression(chain, level = 0) {
  if (!chain) throw new Error('Expressions must contain a chain');

  // break new functions onto new lines if we're not in a nested/sub-expression
  const separator = level > 0 ? ' | ' : '\n| ';

  return chain
    .map((chainObj) => {
      const type = getType(chainObj);

      if (type === 'function') {
        const fn = chainObj.function;
        if (!fn || fn.length === 0) throw new Error('Functions must have a function name');

        const expArgs = getExpressionArgs(chainObj, level);

        return fnWithArgs(fn, expArgs);
      }
    }, [])
    .join(separator);
}

export function fromExpression(expression, type = 'expression') {
  try {
    return parse(String(expression), { startRule: type });
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}

// TODO: OMG This is so bad, we need to talk about the right way to handle bad expressions since some are element based and others not
export function safeElementFromExpression(expression) {
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
export function toExpression(astObj, type = 'expression') {
  if (type === 'argument') return getArgumentString(astObj);

  const validType = ['expression', 'function'].includes(getType(astObj));
  if (!validType) throw new Error('Expression must be an expression or argument function');

  if (getType(astObj) === 'expression') {
    if (!Array.isArray(astObj.chain)) throw new Error('Expressions must contain a chain');

    return getExpression(astObj.chain);
  }

  const expArgs = getExpressionArgs(astObj);
  return fnWithArgs(astObj.function, expArgs);
}
