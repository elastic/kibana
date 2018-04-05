import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { Form, FormGroup, FormControl, Button } from 'react-bootstrap';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

// This is basically a direct copy of the string input, but with some Number() goodness maybe you think that's cheating and it should be
// abstracted. If you can think of a 3rd or 4th usage for that abstraction, cool, do it, just don't make it more confusing. Copying is the
// most understandable way to do this. There, I said it.

// TODO: Support max/min as options
const NumberArgInput = ({ updateValue, value, confirm, commit }) => (
  <Form inline>
    <FormGroup>
      <FormControl
        spellCheck={false}
        value={value}
        onChange={confirm ? updateValue : ev => commit(Number(ev.target.value))}
      />
    </FormGroup>
    {confirm && (
      <Button bsStyle="primary" bsSize="xsmall" onClick={() => commit(Number(value))}>
        {confirm}
      </Button>
    )}
  </Form>
);

NumberArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.number.isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
};

const EnhancedNumberArgInput = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value')
)(NumberArgInput);

EnhancedNumberArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const number = () => ({
  name: 'number',
  displayName: 'number',
  help: 'Input a number',
  simpleTemplate: templateFromReactComponent(EnhancedNumberArgInput),
});
