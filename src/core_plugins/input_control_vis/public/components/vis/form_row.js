import PropTypes from 'prop-types';
import React from 'react';

export const FormRow = (props) => (
  <div className="kuiVerticalRhythm">
    <label className="kuiLabel kuiVerticalRhythmSmall" htmlFor={props.id}>
      {props.label}
    </label>
    <div className="kuiVerticalRhythmSmall">
      {props.children}
    </div>
  </div>
);

FormRow.propTypes = {
  label: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};
