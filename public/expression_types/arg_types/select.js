import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

const SelectArgInput = ({ typeInstance, onValueChange, argValue }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const choices = typeInstance.options.choices;

  function handleChange(ev) {
    onValueChange(ev.target.value);
  }

  const choice = choices.map(c => c.name).find(n => n === argValue.value) || '';

  return (
    <FormControl componentClass="select" value={choice} onChange={handleChange}>
      <option value="" disabled>select column</option>
      {choices.map(choice => (
        <option value={choice.value} key={choice.value}>{choice.name}</option>
      ))}
    </FormControl>
  );
};

SelectArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.shape({
    value: PropTypes.string.isRequired,
  }).isRequired,
  typeInstance: PropTypes.object,
};

export const select = () => ({
  name: 'select',
  displayName: 'Select',
  help: 'Select from multiple options in a drop down',
  simpleTemplate: SelectArgInput,
});
