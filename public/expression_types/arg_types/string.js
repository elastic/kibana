import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, FormControl, Button } from 'react-bootstrap';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';
import { compose, withProps } from 'recompose';

const StringArgInput = ({ updateValue, value, confirm, commit }) => (
  <Form inline>
    <FormGroup>
      <FormControl
        spellCheck={false}
        value={value}
        onChange={confirm ? updateValue : (ev) => commit(ev.target.value)}
      />
    </FormGroup>
    {confirm && (
      <Button bsStyle="primary" bsSize="xsmall" onClick={() => commit(value)}>{confirm}</Button>
    )}
  </Form>
);

StringArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
};

const template = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value'),
)(StringArgInput);

template.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const string = () => ({
  name: 'string',
  displayName: 'string',
  help: 'Input short strings',
  simpleTemplate: template,
});
