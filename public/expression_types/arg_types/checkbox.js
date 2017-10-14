import React from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';

const template = ({ onValueChange, argValue }) => {

  function handleChange() {
    onValueChange(!argValue);
  }


  console.log(argValue);
  return (
    <input
      type="checkbox"
      className="form-control"
      checked={Boolean(argValue)}
      onChange={handleChange}
    />
  );
};

template.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
};

export const checkbox = () => new ArgType('checkbox', {
  displayName: 'Checkbox',
  description: 'A true/false checkbox toggle',
  simpleTemplate: template,
});
