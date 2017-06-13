import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { FormGroup, ControlLabel, FormControl, Button, ButtonToolbar } from 'react-bootstrap';
import { ElementNotSelected } from './element_not_selected';
import './expression.less';

const noSelected = branch(props => !props.element, renderComponent(ElementNotSelected));

const Component = ({ expression, updateValue, setExpression, done }) => {
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

Component.propTypes = {
  expression: PropTypes.string.isRequired,
  updateValue: PropTypes.func,
  setExpression: PropTypes.func,
  done: PropTypes.func,
};

export const Expression = compose(noSelected)(Component);
