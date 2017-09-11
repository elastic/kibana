import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl } from 'react-bootstrap';

export const LabeledText =  ({ type, label, value, className, onChange }) => (
  <div className={className}>
    <FormControl
      type={type}
      value={value}
      onChange={onChange}
    />

    <ControlLabel>{label}</ControlLabel>
  </div>
);

LabeledText.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onChange: PropTypes.func.isRequired,
};
