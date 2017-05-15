import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';


export const Expression = ({ expression, updateValue, onChange }) => {
  let input;

  return (
    <div>
      <FormGroup controlId="formControlsTextarea">
        <ControlLabel>Expression</ControlLabel>
        <FormControl
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={updateValue}
          value={expression}
        />
      </FormGroup>
      <Button bsStyle="primary" onClick={() => onChange(input.value)}>
        Run Expression
      </Button>
    </div>
  );
};

Expression.propTypes = {
  expression: PropTypes.string,
  updateValue: PropTypes.func,
  onChange: PropTypes.func,
};
