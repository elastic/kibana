import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, Button } from 'react-bootstrap';
import { ArgType } from '../arg_type';
import { get } from 'lodash';
import { statefulProp } from '../../lib/stateful_component';
import { compose, withProps } from 'recompose';

const component = ({ updateValue, value, confirm, commit }) => (
  <div>
    <FormGroup>
      <FormControl
        spellCheck={false}
        componentClass="textarea"
        style={{ height: 200 }}
        value={value}
        onChange={confirm ? updateValue : (ev) => commit(ev.target.value)}
      />
    </FormGroup>

    {confirm && (<Button bsStyle="primary" onClick={() => commit(value)}>{confirm}</Button>)}
  </div>
);

component.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
};

const template = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: (value) => onValueChange({
      type: 'string',
      value,
    }),
    value: argValue.value,
  })),
  statefulProp('value'),
)(component);

template.propTypes = {
  argValue: PropTypes.object.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const textarea = () => new ArgType('textarea', {
  displayName: 'textarea',
  description: 'Input long strings',
  template: template,
});
