import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';


export const Expression = ({ expression, updateValue, onChange }) => {
  let input;

  return (
    <div>
      <FormGroup controlId="formControlsTextarea">
        <ControlLabel>
          Expression &nbsp;
          <a className="pull-right" onClick={() => onChange(input.value)}> <i className="fa fa-play-circle"/></a>
        </ControlLabel>


        <FormControl
          spellCheck={false}
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={updateValue}
          value={expression}
        />
      </FormGroup>
    </div>
  );
};

Expression.propTypes = {
  expression: PropTypes.string,
  updateValue: PropTypes.func,
  onChange: PropTypes.func,
};
