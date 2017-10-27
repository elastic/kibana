import { parse } from './grammar';
import { getType } from '../lib/get_type';

function getArgumentString(arg, argKey) {
  const type = getType(arg);
  // TODO: MAJOR -- This breaks for single quoted strings that contain double quotes!

  function maybeArgKey(argString) {
    return (argKey == null || argKey === '_') ? argString : `${argKey}=${argString}`;
  }

  if (type === 'string') return maybeArgKey(`"${arg}"`);
  if (type === 'boolean' || type === 'null' || type === 'number') return maybeArgKey(`${arg}`);
  if (type === 'expression') return maybeArgKey(`{${getExpression(arg.chain)}}`);
  if (type === 'partial') return maybeArgKey('${' + getExpression(arg.chain) + '}');

  throw new Error(`Invalid argument type in AST: ${type}`);
}

function getExpressionArgs(block) {
  const args = block.arguments;

  if (!hasValidateArgs(args)) throw new Error('Arguments can only be an object');

  const argKeys = Object.keys(args);
  return argKeys.map((argKey) => {
    const multiArgs = args[argKey];

    return multiArgs.reduce((acc, arg) => acc.concat(getArgumentString(arg, argKey)), []).join(' ');
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

export function fromExpression(expression, type = 'expression') {
  try {
    return parse(String(expression), { startRule: type });
  } catch (e) {
    throw new Error(`Unable to parse expression: ${expression}\n ${e.message}`);
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

export function toExpression(astObj, type = 'expression') {
  if (type === 'argument') return getArgumentString(astObj);

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
