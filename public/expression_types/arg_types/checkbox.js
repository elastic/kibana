import React from 'react';
import PropTypes from 'prop-types';

const CheckboxArgInput = ({ onValueChange, argValue }) => {

  function handleChange() {
    onValueChange(!argValue);
  }

  return (
    <input
      type="checkbox"
      className="form-control"
      style={{ width: '20px', float: 'right' }}
      checked={Boolean(argValue)}
      onChange={handleChange}
    />
  );
};

CheckboxArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
};

export const checkbox = () => ({
  name: 'checkbox',
  displayName: 'Checkbox',
  help: 'A true/false checkbox toggle',
  simpleTemplate: CheckboxArgInput,
});
