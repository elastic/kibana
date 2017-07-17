import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

const template = ({ typeInstance, data }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const { name, displayName } = typeInstance;
  const { onValueChange, argValue } = data;

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
  data: PropTypes.object,
  resolvedData: PropTypes.string,
  typeInstance: PropTypes.object,
  setLoading: PropTypes.func,
  isLoading: PropTypes.bool,
};

export const textarea = () => new ArgType('textarea', {
  displayName: 'textarea',
  description: 'Input long strings',
  template: template,
});
