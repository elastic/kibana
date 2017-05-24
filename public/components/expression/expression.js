import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl } from 'react-bootstrap';


export const Expression = ({ expression, onChange, setExpression }) => {
  let input;

  return (
    <div>
      <FormGroup controlId="formControlsTextarea">
        <ControlLabel>
          Expression &nbsp;
          <a className="pull-right" onClick={() => setExpression(input.value)}> <i className="fa fa-play-circle"/></a>
        </ControlLabel>


        <FormControl
          spellCheck={false}
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={(ev) => onChange(ev.target.value)}
          value={expression}
        />
      </FormGroup>
    </div>
  );
};

Expression.propTypes = {
  expression: PropTypes.string,
  onChange: PropTypes.func,
  setExpression: PropTypes.func,
};
