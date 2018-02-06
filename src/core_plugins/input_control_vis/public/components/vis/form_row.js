import PropTypes from 'prop-types';
import React from 'react';
import { Tooltip } from 'pivotal-ui/react/tooltip';
import { OverlayTrigger } from 'pivotal-ui/react/overlay-trigger';

import {
  EuiFormRow,
} from '@elastic/eui';

export function FormRow(props) {
  let control = props.children;
  if (!props.control.isEnabled()) {
    const tooltip = (
      <Tooltip className="inputControlDisabledTooltip" >{props.control.disabledReason}</Tooltip>
    );
    control = (
      <OverlayTrigger placement="top" overlay={tooltip}>
        {control}
      </OverlayTrigger>
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
