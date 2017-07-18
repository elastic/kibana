import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

const template = ({ typeInstance, onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const { name, displayName } = typeInstance;
  const choices = typeInstance.options.choices;

  function handleChange(ev) {
    onValueChange({
      [name]: [{
        type: 'string',
        value: ev.target.value,
      }],
    });
  }

  const options = choices.map(choice => (
    <option value={choice.value} key={choice.value}>{choice.name}</option>
  ));

  return (
    <FormGroup controlId="formControlsSelect">
      <ControlLabel>{displayName}</ControlLabel>
      <FormControl componentClass="select" value={argValue.value} onChange={handleChange}>
        {options}
      </FormControl>
    </FormGroup>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.object.isRequired,
  typeInstance: PropTypes.object,
};

export const select = () => new ArgType('select', {
  displayName: 'Select',
  description: 'Select from multiple options in a drop down',
  template: template,
});
