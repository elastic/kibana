import { parse } from './grammar';
import { getType } from '../types/get_type';

function getExpressionArgs(block) {
  const args = block.arguments;

  if (!hasValidateArgs(args)) throw new Error('Arguments can only be an object');

  const argKeys = Object.keys(args);
  return argKeys.map((argKey) => {
    const multiArgs = args[argKey];

    return multiArgs.reduce((acc, arg) => {
      const type = getType(arg);
      if (type === 'string') {
        if (argKey === '_') return acc.concat(`"${arg}"`);
        return acc.concat(`${argKey}="${arg}"`);
      }

      if (type === 'boolean' || type === 'null' || type === 'number') {
        if (argKey === '_') return acc.concat(`${arg}`);
        return acc.concat(`${argKey}=${arg}`);
      }

      if (type === 'expression') return acc.concat(`${argKey}={${getExpression(arg.chain)}}`);
      if (type === 'partial') return acc.concat(`${argKey}=.{${getExpression(arg.chain)}}`);

      throw new Error(`Invalid argument type in AST: ${type}`);
    }, []).join(' ');
  });
}

function hasValidateArgs(args) {
  return (typeof args === 'object' && args != null && !Array.isArray(args));
}

function fnWithArgs(fnName, args) {
  if (!args || args.length === 0) return fnName;
  return `${fnName} ${args.join(' ')}`;
}

function getExpression(chain) {
  if (!chain) throw new Error('expression and partial arguments must contain a chain');

  return chain.map(chainObj => {
    const type = getType(chainObj);

    if (type === 'function' || type === 'partial') {
      const fn = chainObj.function;
      if (!fn || fn.length === 0) throw new Error('Functions and partials must have a function name');

      const expArgs = getExpressionArgs(chainObj);

      return fnWithArgs(fn, expArgs);
    }
  }, []).join(' | ');
}

export function fromExpression(expression) {
  if (typeof expression === 'string' && expression.length === 0) return;
  try {
    return parse(expression);
  } catch (e) {
    throw new Error(`Unable to parse expression: ${e.message}`);
  }
}

export function toExpression(astObj) {
  const validType = ['partial', 'expression', 'function'].includes(getType(astObj));
  if (!validType) {
    throw new Error('Expression must be a partial, expression, or argument function');
  }

  if (['partial', 'expression'].includes(getType(astObj))) {
    if (!Array.isArray(astObj.chain)) {
      throw new Error('Partials or expressions must contain a chain');
    }
    return getExpression(astObj.chain);
  }

  const expArgs = getExpressionArgs(astObj);
  return fnWithArgs(astObj.function, expArgs);
}
