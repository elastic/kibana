import React from 'react';
import { compose, withPropsOnChange, withHandlers } from 'recompose';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { sortBy } from 'lodash';
import { createStatefulPropHoc } from '../../../components/enhance/stateful_prop';
import { getType } from '../../../../common/lib/get_type';
import { SimpleMathFunction } from './simple_math_function';
import { getFormObject } from './get_form_object';
import './datacolumn.less';

const maybeQuoteValue = val => (val.match(/\s/) ? `'${val}'` : val);

// TODO: Garbage, we could make a much nicer math form that can handle way more.
const DatacolumnArgInput = ({
  onValueChange,
  columns,
  mathValue,
  setMathFunction,
  renderError,
}) => {
  if (mathValue.error) return renderError();

  const inputRefs = {};
  const valueNotSet = val => !val || val.length === 0;
  const updateFunctionValue = () => {
    // if setting size, auto-select the first column if no column is already set
    if (inputRefs.fn.value === 'size') {
      const col = inputRefs.column.value || (columns[0] && columns[0].name);
      if (col) return onValueChange(`${inputRefs.fn.value}(${maybeQuoteValue(col)})`);
    }

    // inputRefs.column is the column selection, if there is no value, do nothing
    if (valueNotSet(inputRefs.column.value)) {
      return setMathFunction(inputRefs.fn.value);
    }

    // inputRefs.fn is the math function to use, if it's not set, just use the value input
    if (valueNotSet(inputRefs.fn.value)) {
      return onValueChange(inputRefs.column.value);
    }

    // inputRefs.fn has a value, so use it as a math.js expression
    onValueChange(`${inputRefs.fn.value}(${maybeQuoteValue(inputRefs.column.value)})`);
  };

  const column = columns.map(col => col.name).find(colName => colName === mathValue.column) || '';

  return (
    <div className="canvas__argtype--datacolumn">
      <SimpleMathFunction
        value={mathValue.fn}
        inputRef={ref => (inputRefs.fn = ref)}
        onChange={updateFunctionValue}
      />
      <FormControl
        componentClass="select"
        placeholder="select"
        value={column}
        inputRef={ref => (inputRefs.column = ref)}
        onChange={updateFunctionValue}
      >
        <option value="" disabled>
          select column
        </option>
        {sortBy(columns, 'name').map(column => (
          <option key={column.name} value={column.name}>
            {column.name}
          </option>
        ))}
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
  withPropsOnChange(['argValue', 'columns'], ({ argValue, columns }) => ({
    mathValue: (argValue => {
      if (getType(argValue) !== 'string') return { error: 'argValue is not a string type' };
      try {
        const matchedCol = columns.find(({ name }) => argValue === name);
        const val = matchedCol ? maybeQuoteValue(matchedCol.name) : argValue;
        return getFormObject(val);
      } catch (e) {
        return { error: e.message };
      }
    })(argValue),
  })),
  createStatefulPropHoc('mathValue', 'setMathValue'),
  withHandlers({
    setMathFunction: ({ mathValue, setMathValue }) => fn => setMathValue({ ...mathValue, fn }),
  })
)(DatacolumnArgInput);

simpleTemplate.propTypes = {
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  columns: PropTypes.array.isRequired,
};

export const datacolumn = () => ({
  name: 'datacolumn',
  displayName: 'Column',
  help: 'Select the data column',
  default: '""',
  simpleTemplate,
});
