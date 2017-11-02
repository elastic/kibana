import React from 'react';
import PropTypes from 'prop-types';

export function PanelMaximizeIcon({ onMaximize }) {
  return (
    <button
      className="kuiMicroButton viewModeExpandPanelToggle"
      aria-label="Maximize panel"
      data-test-subj="dashboardPanelExpandIcon"
      onClick={onMaximize}
    >
      <span
        aria-hidden="true"
        className="kuiIcon fa-expand"
      />
    </button>
  );
}

PanelMaximizeIcon.propTypes = {
  onMaximize: PropTypes.func.isRequired
};
