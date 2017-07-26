import { parse } from 'mathjs';
import { toExpression, fromExpression } from '../../common/lib/ast';

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
  const isExpression = argValue.type === 'expression';
  const isPartial = argValue.type === 'partial';

  if (!isExpression && !isPartial) return argValue;

  return fromExpression(argValue.value);
}

export function toInterfaceValue(argValue) {
  if (argValue == null) {
    return {
      type: 'string',
      value: null,
      function: null,
    };
  }

  const { function: fn, type, value, chain } = argValue;

  // if argValue is a function, set the value to its expression string
  if (argValue.type === 'expression' || argValue.type === 'partial') {
    return {
      type,
      chain,
      value: toExpression(argValue),
      function: fn || null,
    };
  }

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

export function toAstValue(argValue) {
  if (Array.isArray(argValue)) {
    const values = argValue.map(mapFromMathValue);
    return values.map(mapFromFunctionValue);
  }

  return mapFromFunctionValue(mapFromMathValue(argValue));
}