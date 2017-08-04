import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { MathExpression } from './math_expression';
import { ArgType } from '../../arg_type';
import { toAstValue } from '../../../lib/map_arg_value';
import './datacolumn.less';

const simpleTemplate = ({ onValueChange, columns, argValue }) => {
  const inputRefs = {};

  const updateValue = (valueType) => () => {
    onValueChange(toAstValue({
      type: valueType,
      value: inputRefs.value.value,
      function: inputRefs.fn.value,
    }));
  };

  const formControl = (argVal) => {
    switch (argVal.type) {
      case 'string':
      case 'math':
        return (
          <div className="canvas__argtype--datacolumn">
            <MathExpression
              value={argVal.function}
              inputRef={ref => inputRefs.fn = ref}
              onChange={updateValue(argVal.type)}
            />
            <FormControl
              componentClass="select"
              placeholder="select"
              value={argVal.value}
              inputRef={ref => inputRefs.value = ref}
              onChange={updateValue(argVal.type)}
            >
              <option value="select" disabled>select column</option>
              { columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>) }
            </FormControl>
          </div>
        );

      default:
        return (
          <div className="canvas__argtype--datacolumn">
            <FormControl componentClass="textarea" placeholder="textarea" defaultValue={argVal.value} />
          </div>
        );
    }
  };

  return formControl(argValue);
};

simpleTemplate.propTypes = {
  columns: PropTypes.array.isRequired,
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const datacolumn = () => new ArgType('datacolumn', {
  displayName: 'Column',
  description: 'Select the data column',
  simpleTemplate,
});
