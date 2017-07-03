import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

const template = ({ typeInstance, data }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const { name, displayName } = typeInstance;
  const choices = typeInstance.options.choices;
  const { onValueChange, argValue } = data;

  console.log('data', data);
  console.log('typeInstance', typeInstance);

  //const { name } = typeInstance;
  //const { onValueChange } = data;

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
  data: PropTypes.object,
  resolvedData: PropTypes.string,
  typeInstance: PropTypes.object,
  setLoading: PropTypes.func,
  isLoading: PropTypes.bool,
};

export const select = () => new ArgType('select', {
  displayName: 'Select',
  description: 'Select from multiple options in a drop down',
  template: template,
});
