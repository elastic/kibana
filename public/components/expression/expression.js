import React from 'react';
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
