import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button, ButtonToolbar } from 'react-bootstrap';
import './expression.less';

export const Expression = ({ expression, onChange, setExpression, done }) => {
  let input;

  return (
    <div className="canvas__expression">
      <FormGroup controlId="formControlsTextarea">



        <FormControl
          spellCheck={false}
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={(ev) => onChange(ev.target.value)}
          value={expression}
        />
        <ControlLabel>
          The Canvas expression backing the element. Better know what you're doing here.
        </ControlLabel>
      </FormGroup>
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => setExpression(input.value)}> Run</Button>
        {done ?
          (<Button onClick={done}> Done</Button>)
        : null}
      </ButtonToolbar>
    </div>
  );
};

Expression.propTypes = {
  expression: PropTypes.string,
  onChange: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
};
