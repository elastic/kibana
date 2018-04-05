import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { FormGroup, FormControl, Button } from 'react-bootstrap';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

const TextAreaArgInput = ({ updateValue, value, confirm, commit, renderError }) => {
  if (typeof value !== 'string') {
    renderError();
    return null;
  }
  return (
    <div>
      <FormGroup>
        <FormControl
          spellCheck={false}
          componentClass="textarea"
          style={{ height: 200 }}
          value={value}
          onChange={confirm ? updateValue : ev => commit(ev.target.value)}
        />
      </FormGroup>

      {confirm && (
        <Button bsStyle="primary" bsSize="xsmall" onClick={() => commit(value)}>
          {confirm}
        </Button>
      )}
    </div>
  );
};

TextAreaArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
  renderError: PropTypes.func,
};

const EnhancedTextAreaArgInput = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value')
)(TextAreaArgInput);

EnhancedTextAreaArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const textarea = () => ({
  name: 'textarea',
  displayName: 'textarea',
  help: 'Input long strings',
  template: templateFromReactComponent(EnhancedTextAreaArgInput),
});
