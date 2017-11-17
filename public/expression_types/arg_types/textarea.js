import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, Button } from 'react-bootstrap';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';
import { compose, withProps } from 'recompose';

const TextAreaArgInput = ({ updateValue, value, confirm, commit, renderError }) => {
  if (typeof value !== 'string') renderError();

  return (
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

      {confirm && (<Button bsStyle="primary" bsSize="xsmall" onClick={() => commit(value)}>{confirm}</Button>)}
    </div>
  );
};

TextAreaArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]).isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
  renderError: PropTypes.func,
};

const template = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value'),
)(TextAreaArgInput);

template.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const textarea = () => ({
  name: 'textarea',
  displayName: 'textarea',
  help: 'Input long strings',
  template: template,
});
