import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiFormRow,
  EuiToolTip,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';

export function FormRow(props) {
  let control = props.children;
  if (!props.control.isEnabled()) {
    control = (
      <EuiToolTip placement="top" content={props.control.disabledReason}>
        {control}
      </EuiToolTip>
    );
  }

  let label = props.label;
  if (props.control.warning && props.control.warning.length > 0) {
    label = (
      <EuiText>
        {props.label}
        <EuiIconTip
          content={props.control.warning}
          position="right"
          type="alert"
          aria-label="Warning"
        />
      </EuiText>
    );
  }

  return (
    <EuiFormRow
      label={label}
      id={props.id}
      data-test-subj={'inputControl' + props.controlIndex}
    >
      {control}
    </EuiFormRow>
  );
}

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  controlIndex: PropTypes.number.isRequired,
  control: PropTypes.object.isRequired,
};
