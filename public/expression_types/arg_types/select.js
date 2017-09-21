import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';
import { ArgType } from '../arg_type';

const template = ({ typeInstance, onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const choices = typeInstance.options.choices;

  function handleChange(ev) {
    onValueChange(ev.target.value);
  }

  const options = choices.map(choice => (
    <option value={choice.value} key={choice.value}>{choice.name}</option>
  ));

  return (
    <FormControl componentClass="select" value={argValue.value} onChange={handleChange}>
      {options}
    </FormControl>
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  typeInstance: PropTypes.object,
};

export const select = () => new ArgType('select', {
  displayName: 'Select',
  description: 'Select from multiple options in a drop down',
  simpleTemplate: template,
});
