import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { MathExpression } from './math_expression';
import { ArgType } from '../../arg_type';
import './datacolumn.less';

const template = ({ data, typeInstance }) => {
  const { onValueChange, columns, argValue } = data;
  const { name, displayName } = typeInstance;
  const inputRefs = {};

  const formControl = (argVal) => {
    const updateValue = (valueType) => () => {
      onValueChange({
        [name]: [{
          type: valueType,
          value: inputRefs.value.value,
          function: inputRefs.fn.value,
        }],
      });
    };

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

  return (
    <FormGroup key={name} controlId="formControlsSelect">
      <ControlLabel>{ displayName }</ControlLabel>
      { formControl(argValue) }
    </FormGroup>
  );
};

template.propTypes = {
  data: PropTypes.object,
  typeInstance: PropTypes.object,
};

export const datacolumn = () => new ArgType('datacolumn', {
  displayName: 'Column',
  description: 'Select the data column',
  template,
});
