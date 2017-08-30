import React from 'react';
import PropTypes from 'prop-types';
import { sortBy } from 'lodash';
import { FormControl } from 'react-bootstrap';
import { MathExpression } from './math_expression';
import { ArgType } from '../../arg_type';
import { toExpressionAst } from '../../../lib/map_arg_value';
import './datacolumn.less';

const simpleTemplate = ({ onValueChange, columns, argValue, renderError }) => {
  const inputRefs = {};

  // use fallback when given a type we can't handle
  if (argValue.type !== 'string' && argValue.type !== 'math') return renderError();

  const updateFunctionValue = (valueType) => () => {
    onValueChange(toExpressionAst({
      type: valueType,
      value: inputRefs.value.value,
      function: inputRefs.fn.value,
    }));
  };

  return (
    <div className="canvas__argtype--datacolumn">
      <MathExpression
        value={argValue.function}
        inputRef={ref => inputRefs.fn = ref}
        onChange={updateFunctionValue(argValue.type)}
      />
      <FormControl
        componentClass="select"
        placeholder="select"
        value={argValue.value}
        inputRef={ref => inputRefs.value = ref}
        onChange={updateFunctionValue(argValue.type)}
      >
        <option value="select" disabled>select column</option>
        { sortBy(columns, 'name').map(column => <option key={column.name} value={column.name}>{column.name}</option>) }
      </FormControl>
    </div>
  );
};

simpleTemplate.propTypes = {
  columns: PropTypes.array.isRequired,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const datacolumn = () => new ArgType('datacolumn', {
  displayName: 'Column',
  description: 'Select the data column',
  simpleTemplate,
});
