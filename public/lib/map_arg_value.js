import { parse } from 'mathjs';
import { toExpression, fromExpression } from '../../common/lib/ast';
import { getType } from '../../common/types/get_type';

function isExpressionOrPartial(arg) {
  return arg.type === 'expression' || arg.type === 'partial';
}

function mapToMathValue(mathObj, { value, function: fn }) {
  // if there's a single SymbolNode argument, map to the value
  const hasArgs = mathObj.args && mathObj.args.length === 1;

  if (hasArgs && mathObj.args[0].type === 'SymbolNode') {
    return {
      type: 'math',
      value: mathObj.args[0].name,
      function: mathObj.fn.name || null,
    };
  }

  // anything else, just change the type to math
  return {
    type: 'math',
    value,
    function: fn || null,
  };
}

function mapFromMathValue(argValue) {
  const noFunction = argValue.function == null || argValue.function.length === 0;
  if (argValue.type !== 'math' && noFunction) return argValue;

  if (noFunction) {
    return {
      type: 'string',
      function: null,
      value: argValue.value,
    };
  }

  return {
    type: 'string',
    value: `${argValue.function}(${argValue.value})`,
    function: null,
  };
}

function mapFromFunctionValue(argValue) {
  if (!isExpressionOrPartial(argValue)) return argValue;
  return fromExpression(argValue.value);
}

export function toInterfaceAst(argValue) {
  if (argValue == null) {
    return {
      type: 'string',
      value: null,
      function: null,
    };
  }

  const { function: fn, type, value, chain } = argValue;

  // if argValue is a function, set the value to its expression string
  if (isExpressionOrPartial(argValue)) {
    return {
      type,
      chain,
      value: toExpression(argValue),
      function: fn || null,
    };
  }

  // TODO: We shouldn't be handling mathJS stuff in here
  try {
    // check if the value is a math expression, and set its type if it is
    const mathObj = parse(argValue.value);
    if (mathObj.type !== 'SymbolNode') {
      // SymbolNode is just a string, anything else must be a math expression
      return mapToMathValue(mathObj, argValue);
    }
  } catch (e) {
    // math.js throws on crazy values, errors can be swallowed here
  }

  return {
    type,
    value,
    function: fn || null,
  };
}

export function toExpressionAst(argValue, batch = true) {
  if (batch && Array.isArray(argValue)) return argValue.map(val => toExpressionAst(val, false));

  return mapFromFunctionValue(mapFromMathValue(argValue));
}

// function assumes an expression AST, an interface AST will not work correctly here
export function toExpressionString(argValue) {
  if (!argValue) return '';
  if (isExpressionOrPartial(argValue)) return toExpression(argValue);
  return argValue.value;
}

// type here should be a value type, taken from an expression AST, not an interface AST
export function fromExpressionString(argExpression, type) {
  if (type === 'function' || type === 'expression' || type === 'partial') return fromExpression(argExpression);
  return { type: type || getType(argExpression), value: argExpression };
}
