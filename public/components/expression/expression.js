import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Button, ButtonToolbar } from 'react-bootstrap';
import './expression.less';
import { ExpressionInput } from '../expression_input';

export const Expression = ({
  formState,
  updateValue,
  setExpression,
  done,
  error,
}) => {
  return (
    <div className="canvas__expression">
      <FormGroup controlId="formControlsTextarea" validationState={error ? 'error' : null}>
        <ExpressionInput
          value={formState.expression}
          onChange={updateValue}
        />
        <label>
          { error ? error : `The Canvas expression backing the element. Better know what you're doing here.`}
        </label>
      </FormGroup>
      <ButtonToolbar>
        <Button disabled={!!error} bsStyle="success" onClick={() => setExpression(formState.expression)}> Run</Button>
        {done && (
          <Button onClick={done}> {formState.dirty ? 'Cancel' : 'Done'}</Button>
        )}
      </ButtonToolbar>
    </div>
  );
};

Expression.propTypes = {
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
  error: PropTypes.string,
};
