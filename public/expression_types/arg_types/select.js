import React from 'react';
import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

const getArgValueString = argValue => typeof argValue === 'string' ? argValue : argValue.value;

const SelectArgInput = ({ typeInstance, onValueChange, argValue }) => {
  // TODO: why is this neccesary? Does the dialog really need to know what parameter it is setting?
  // passing in simply the select choices is probably better here
  const choices = typeInstance.options.choices;
  const handleChange = ev => onValueChange(ev.target.value);
  const choice = choices.map(c => c.value).find(n => n === getArgValueString(argValue)) || '';

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
  argValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }).isRequired,
  ]),
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    options: PropTypes.shape({
      choices: PropTypes.array.isRequired,
    }),
  }),
};

export const select = () => ({
  name: 'select',
  displayName: 'Select',
  help: 'Select from multiple options in a drop down',
  simpleTemplate: SelectArgInput,
});
