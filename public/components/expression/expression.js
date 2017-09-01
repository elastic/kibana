import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { FormGroup, ControlLabel, FormControl, Button, ButtonToolbar } from 'react-bootstrap';
import { ElementNotSelected } from './element_not_selected';
import './expression.less';

const noSelected = branch(props => !props.element, renderComponent(ElementNotSelected));

const Component = ({ formState, updateValue, setExpression, done }) => {
  let input;

  return (
    <div className="canvas__expression">
      <FormGroup controlId="formControlsTextarea">
        <FormControl
          spellCheck={false}
          componentClass="textarea"
          placeholder="Enter expression..."
          inputRef={ref => input = ref}
          onChange={updateValue}
          value={formState.expression}
        />
        <ControlLabel>
          The Canvas expression backing the element. Better know what you're doing here.
        </ControlLabel>
      </FormGroup>
      <ButtonToolbar>
        <Button bsStyle="success" onClick={() => setExpression(input.value)}> Run</Button>
        {done ?
          (<Button onClick={done}> {formState.dirty ? 'Cancel' : 'Done'}</Button>)
        : null}
      </ButtonToolbar>
    </div>
  );
};

Component.propTypes = {
  formState: PropTypes.object,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
};

export const Expression = compose(noSelected)(Component);
