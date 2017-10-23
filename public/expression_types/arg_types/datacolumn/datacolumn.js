import React from 'react';
import PropTypes from 'prop-types';
import { sortBy } from 'lodash';
import { FormControl } from 'react-bootstrap';
import { SimpleMathFunction } from './simple_math_function';
import { getType } from '../../../../common/types/get_type';
import { parse } from 'mathjs';

import './datacolumn.less';

const simpleTemplate = ({ onValueChange, columns, argValue, renderError }) => {
  // We can only handle strings, we'll figure out later if they're reasonable to turn into math inputs
  if (getType(argValue) !== 'string') return renderError();

  // TODO: Garbage, we could make a much nicer math form that can handle way more.
  function getFormObject() {
    if (argValue === '') {
      return {
        fn: '',
        column: '',
      };
    }

    try {
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
        renderError();
      }
    } catch (e) {
      renderError();
    }
  }

  const inputRefs = {};
  const updateFunctionValue = () => {
    if (!inputRefs.fn.value || inputRefs.fn.value.length === 0) onValueChange(inputRefs.column.value);
    else onValueChange(`${inputRefs.fn.value}(${inputRefs.column.value})`);
  };

  const formValues = getFormObject();
  return (
    <div className="canvas__argtype--datacolumn">
      <SimpleMathFunction
        value={formValues.fn}
        inputRef={ref => inputRefs.fn = ref}
        onChange={updateFunctionValue}
      />
      <FormControl
        componentClass="select"
        placeholder="select"
        value={formValues.column}
        inputRef={ref => inputRefs.column = ref}
        onChange={updateFunctionValue}
      >
        <option value="" disabled>select column</option>
        { sortBy(columns, 'name').map(column => <option key={column.name} value={column.name}>{column.name}</option>) }
      </FormControl>
    </div>
  );
};

simpleTemplate.propTypes = {
  columns: PropTypes.array.isRequired,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const datacolumn = () => ({
  name: 'datacolumn',
  displayName: 'Column',
  description: 'Select the data column',
  defaultValue: '""',
  simpleTemplate,
});
