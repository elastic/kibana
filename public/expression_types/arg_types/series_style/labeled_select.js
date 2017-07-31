import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';

export const LabeledSelect = ({ label, value, argName, onChange }) => (
  <div className={`canvas__argtype--seriesStyle--${argName}`}>
    <ControlLabel>{label}</ControlLabel>
    <FormControl
      componentClass="select"
      value={value}
      onChange={ev => onChange(argName, ev)}
    >
      <option value="0">None</option>
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
    </FormControl>
  </div>
);

LabeledSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  argName: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
