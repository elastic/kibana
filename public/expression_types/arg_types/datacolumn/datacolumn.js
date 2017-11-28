import React from 'react';
import { compose, withPropsOnChange, withHandlers } from 'recompose';
import PropTypes from 'prop-types';
import { sortBy } from 'lodash';
import { FormControl } from 'react-bootstrap';
import { SimpleMathFunction } from './simple_math_function';
import { createStatefulPropHoc } from '../../../components/enhance/stateful_prop';
import { getType } from '../../../../common/lib/get_type';
import { parse } from 'mathjs';

import './datacolumn.less';

// TODO: Garbage, we could make a much nicer math form that can handle way more.
function getFormObject(argValue) {
  if (argValue === '') {
    return {
      fn: '',
      column: '',
    };
  }

  // check if the value is a math expression, and set its type if it is
  const mathObj = parse(argValue);

  // A symbol node is a plain string, so we guess that they're looking for a column.
  if (mathObj.type === 'SymbolNode') {
    return {
      fn: '',
      column: argValue,
    };

  // Check if its a simple function, eg a function wrapping a symbol node
  } else if (mathObj.type === 'FunctionNode' && mathObj.args[0].type === 'SymbolNode') {
    return {
      fn: mathObj.name,
      column: mathObj.args[0].name,
    };

  // Screw it, textarea for you my fancy.
  } else {
    throw new Error(`Invalid math object type: ${mathObj.type}`);
  }
}

const DatacolumnArgInput = ({ onValueChange, columns, mathValue, setMathFunction, renderError }) => {
  if (mathValue.error) return renderError();

  const inputRefs = {};
  const valueNotSet = val => !val || val.length === 0;
  const updateFunctionValue = () => {
    // if setting size, auto-select the first column if no column is already set
    if (inputRefs.fn.value === 'size') {
      const col = inputRefs.column.value || columns[0] && columns[0].name;
      if (col) return onValueChange(`${inputRefs.fn.value}(${col})`);
    }

    // inputRefs.column is the column selection, if there is no value, do nothing
    if (valueNotSet(inputRefs.column.value)) {
      return setMathFunction(inputRefs.fn.value);
    }

    // inputRefs.fn is the math.js function to use, if it's not set, just use the value input
    if (valueNotSet(inputRefs.fn.value)) {
      return onValueChange(inputRefs.column.value);
    }

    // inputRefs.fn has a value, so use it as a math.js expression
    onValueChange(`${inputRefs.fn.value}(${inputRefs.column.value})`);
  };

  const column = columns.map(col => col.name).find(colName => colName === mathValue.column) || '';

  return (
    <div className="canvas__argtype--datacolumn">
      <SimpleMathFunction
        value={mathValue.fn}
        inputRef={ref => inputRefs.fn = ref}
        onChange={updateFunctionValue}
      />
      <FormControl
        componentClass="select"
        placeholder="select"
        value={column}
        inputRef={ref => inputRefs.column = ref}
        onChange={updateFunctionValue}
      >
        <option value="" disabled>select column</option>
        { sortBy(columns, 'name').map(column => (
          <option key={column.name} value={column.name}>{column.name}</option>
        )) }
      </FormControl>
    </div>
  );
};

DatacolumnArgInput.propTypes = {
  columns: PropTypes.array.isRequired,
  onValueChange: PropTypes.func.isRequired,
  mathValue: PropTypes.object.isRequired,
  setMathFunction: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
};

const simpleTemplate = compose(
  withPropsOnChange(['argValue'], ({ argValue }) => ({
    mathValue: ((argValue) => {
      if (getType(argValue) !== 'string') return { error: 'argValue is not a string type' };
      try {
        return getFormObject(argValue);
      } catch (e) {
        return { error: e.message };
      }
    })(argValue),
  })),
  createStatefulPropHoc('mathValue', 'setMathValue'),
  withHandlers({
    setMathFunction: ({ mathValue, setMathValue }) => (fn) => setMathValue({ ...mathValue, fn }),
  })
)(DatacolumnArgInput);

simpleTemplate.propTypes = {
  argValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]).isRequired,
};

export const datacolumn = () => ({
  name: 'datacolumn',
  displayName: 'Column',
  help: 'Select the data column',
  default: '""',
  simpleTemplate,
});
