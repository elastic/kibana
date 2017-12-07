import PropTypes from 'prop-types';
import React from 'react';
import { Tooltip } from 'pui-react-tooltip';
import { OverlayTrigger } from 'pui-react-overlay-trigger';

export function FormRow(props) {
  let control = props.children;
  if (!props.control.isEnabled()) {
    const tooltip = (
      <Tooltip>{props.control.disabledReason}</Tooltip>
    );
    control = (
      <OverlayTrigger placement="top" overlay={tooltip}>
        {control}
      </OverlayTrigger>
    );
  }

  return (
    <div
      className="kuiVerticalRhythm"
      data-test-subj={'inputControl' + props.controlIndex}
    >
      <label className="kuiLabel kuiVerticalRhythmSmall" htmlFor={props.id}>
        {props.label}
      </label>
      <div className="kuiVerticalRhythmSmall">
        {control}
      </div>
    </div>
  );
}

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  controlIndex: PropTypes.number.isRequired,
  control: PropTypes.object.isRequired,
};
