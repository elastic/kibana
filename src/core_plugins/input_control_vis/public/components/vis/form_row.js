import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiFormRow,
  EuiToolTip,
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

  return (
    <EuiFormRow
      label={props.label}
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
