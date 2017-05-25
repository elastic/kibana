import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

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
          function: inputRefs.function.value,
        }],
      });
    };

    switch (argVal.type) {
      case 'string':
      case 'math':
        return (
          <div>
            <FormControl
              componentClass="select"
              placeholder="raw"
              defaultValue={argVal.function}
              inputRef={ref => inputRefs.function = ref}
              onChange={updateValue(argVal.type)}
            >
              <option value="">value</option>
              <option value="median">median</option>
            </FormControl>

            <FormControl
              componentClass="select"
              placeholder="select"
              defaultValue={argVal.value}
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
          <FormControl componentClass="textarea" placeholder="textarea" defaultValue={argVal.value} />
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

export const dataframeColumn = () => new ArgType('dataframe_column', {
  displayName: 'Column',
  description: 'Select the data column',
  template,
});
