import { last } from 'lodash';
import { parse } from 'mathjs';
import { toExpression, fromExpression } from '../../common/lib/ast';

function mapToMathValue(mathObj, val) {
  // if there's a single SymbolNode argument, map to the value
  if (mathObj.args.length === 1 && mathObj.args[0].type === 'SymbolNode') {
    return {
      type: 'math',
      value: mathObj.args[0].name,
      function: mathObj.fn.name,
    };
  }

  // anything else, just change the type to math
  return {
    type: 'math',
    value: val.value,
    function: null,
  };
}

function mapFromMathValue(argValue) {
  if (argValue.type !== 'math') return argValue;

  if (argValue.function === null) {
    return {
      ...argValue,
      type: 'string',
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

  if (!isExpression && !isPartial)  return argValue;

  return fromExpression(argValue.value);
}

export function toInterfaceValue(argValue, multiVal = false) {
  // if not multiVal, only use the last value
  const vals = (!multiVal) ? [last(argValue)] : argValue;

  const resolvedVal = vals.reduce((acc, val) => {
    if (val == null) {
      return acc.concat({
        type: 'string',
        value: null,
        function: null,
      });
    }

    // if value is a function, convert it to an expression string
    if (val.type === 'expression' || val.type === 'partial') {
      return acc.concat({
        type: val.type,
        value: toExpression(val),
        function: val.function || null,
      });
    }

    // check if the value is a math expression, and set its type if it is
    const mathObj = parse(val.value);
    if (mathObj.type !== 'SymbolNode') {
      // SymbolNode is just a string, anything else must be a math expression
      return acc.concat(mapToMathValue(mathObj, val));
    }

    return acc.concat({
      type: val.type,
      value: val.value,
      function: val.function || null,
    });
  }, []);

  // if multival, return array, otherwise just the value
  return (multiVal) ? resolvedVal : resolvedVal[0];
}

export function toAstValue(argValue) {
  if (Array.isArray(argValue)) {
    const values = argValue.map(mapFromMathValue);
    return values.map(mapFromFunctionValue);
  }

  return mapFromFunctionValue(mapFromMathValue(argValue));
}