import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';

const mapToOptions = (val) => {
  const tuple = (!Array.isArray(val)) ? [val] : val;
  return (<option value={tuple[0]} key={tuple[0]}>{tuple[1] || tuple[0]}</option>);
};

export const LabeledSelect =  ({ label, value, values, className, onChange }) => (
  <div className={className}>
    <FormControl
      componentClass="select"
      value={value}
      onChange={onChange}
    >
      <option>--</option>
      {values.map(mapToOptions)}
    </FormControl>

    <ControlLabel>{label}</ControlLabel>
  </div>
);

LabeledSelect.propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  values: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};
