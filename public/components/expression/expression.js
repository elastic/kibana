import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';

export const Expression = ({ value, onChange }) => (
  <FormGroup controlId="formControlsTextarea">
    <ControlLabel>Expression</ControlLabel>
    <FormControl
      componentClass="textarea"
      placeholder="Enter expression..."
      onChange={(e) => onChange(e.target.value)}
      value={value}
    />
  </FormGroup>
);

Expression.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};
