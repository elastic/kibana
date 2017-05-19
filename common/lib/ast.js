/*
This breaks in the browser, besides, its faster if we generate the parser and load that
const grammar = fs.readFileSync(path.resolve(__dirname, '../grammar.peg'), 'utf8');
const fs = require('fs');
const path = require('path');
const PEG = require('pegjs');
const Parser = PEG.generate(grammar);
*/

import Parser from './grammar';

function getExpressionArgs(block) {
  const args = block.arguments;

  if (!hasValidateArgs(args)) throw new Error('Arguments can only be an object');

  const argKeys = Object.keys(args);
  return argKeys.map((argKey) => {
    // return getExpressionArgs(argKey, args[argKey]);
    const multiArgs = args[argKey];

    return multiArgs.reduce((acc, arg) => {
      if (arg.type === 'string' || arg.type === 'number') {
        if (argKey === '_') return acc.concat(`"${arg.value}"`);
        return acc.concat(`${argKey}="${arg.value}"`);
      }

      if (arg.type === 'expression' || arg.type === 'partial') {
        if (!arg.chain) throw new Error('expression and partial arguments must contain a chain');
        return acc.concat(`${argKey}=${getExpression(arg.chain, arg.type)}`);
      }

      throw new Error(`Invalid argument type in AST: ${arg.type}`);
    }, []).join(', ');
  });
}

function hasValidateArgs(args) {
  return (typeof args === 'object' && args != null && !Array.isArray(args));
}

function joinArgs(fnName, args) {
  return `${fnName}(${args.join(', ')})`;
}

function getExpression(chain, expType = 'expression', exp = '') {
  return chain.reduce((expression, chainObj) => {
    const type = chainObj.type;

    if (type === 'function' || type === 'partial') {
      const fn = chainObj.function;
      const fnName = (expType === 'partial' || expression.length > 0) ? `.${fn}` : fn;

      if (!fn || fn.length === 0) throw new Error('Functions and partials must have a function name');

      const expArgs = getExpressionArgs(chainObj);

      return `${expression}${joinArgs(fnName, expArgs)}`;
    }
  }, exp);
}

export function fromExpression(expression) {
  if (typeof expression === 'string' && expression.length === 0) return;
  try {
    return Parser.parse(expression);
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}

export function toExpression(astObj) {
  const validType = ['partial', 'expression', 'function'].includes(astObj.type);
  if (!validType) {
    throw new Error('Expression must be a partial, expression, or argument function');
  }

  if (['partial', 'expression'].includes(astObj.type)) {
    if (!Array.isArray(astObj.chain)) {
      throw new Error('Partials or expressions must contain a chain');
    }
    return getExpression(astObj.chain, astObj.type);
  }

  const expArgs = getExpressionArgs(astObj);
  return joinArgs(astObj.function, expArgs);
}
