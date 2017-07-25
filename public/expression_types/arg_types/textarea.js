import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';
import { ArgType } from '../arg_type';
import { get } from 'lodash';
import { statefulProp } from '../../lib/stateful_component';
import { compose, withPropsOnChange, withProps } from 'recompose';

const template = ({ updateValue, typeInstance, commit, value }) => {
  // Why is this neccesary? Does the dialog really need to know what parameter it is setting?
  const { displayName } = typeInstance;
  const confirm = get(typeInstance, 'options.confirm');

  return (
    <div>
      <FormGroup>
        <ControlLabel>
          {displayName}
        </ControlLabel>
        <FormControl
          spellCheck={false}
          componentClass="textarea"
          style={{ height: 200 }}
          /*inputRef={ref => input = ref}*/
          value={value}
          onChange={confirm ? updateValue : () => commit(value)}
        />
      </FormGroup>
      {!confirm ? null : (
        <Button bsStyle="primary" onClick={() => commit(value)}>{confirm}</Button>
      )}
    </div>

  );
};

template.propTypes = {
  resolvedData: PropTypes.string,
  typeInstance: PropTypes.object,
  commit: PropTypes.func,
  updateValue: PropTypes.func,
  value: PropTypes.string,
};

export const textarea = () => new ArgType('textarea', {
  displayName: 'textarea',
  description: 'Input long strings',
  template: compose(
    withPropsOnChange(['argValue'], ({ argValue: { value } }) => ({
      value,
    })),
    withProps(({ onValueChange, typeInstance }) => ({
      commit: (value) => onValueChange({
        [typeInstance.name]: [{
          type: 'string',
          value,
        }],
      }),
    })),
    statefulProp('value'),
  )(template),
});
