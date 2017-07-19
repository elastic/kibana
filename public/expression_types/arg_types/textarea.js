import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

const template = ({ typeInstance, onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const { name, displayName } = typeInstance;

  function handleChange(ev) {
    onValueChange({
      [name]: [{
        type: 'string',
        value: ev.target.value,
      }],
    });
  }

  return (
    <FormGroup controlId="formControlsSelect">
      <ControlLabel>
        {displayName}
      </ControlLabel>
      <FormControl
        spellCheck={false}
        componentClass="textarea"
        style={{ height: 200 }}
        /*inputRef={ref => input = ref}*/
        value={argValue.value}
        onChange={handleChange}
      />
    </FormGroup>
  );
};

template.propTypes = {
  resolvedData: PropTypes.string,
  typeInstance: PropTypes.object,
  onValueChange: PropTypes.func,
  argValue: PropTypes.object,
};

export const textarea = () => new ArgType('textarea', {
  displayName: 'textarea',
  description: 'Input long strings',
  template: template,
});
