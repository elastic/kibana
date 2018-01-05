import React from 'react';
import PropTypes from 'prop-types';

export function PanelMinimizeIcon({ onMinimize }) {
  return (
    <button
      className="kuiMicroButton viewModeExpandPanelToggle"
      aria-label="Minimize panel"
      data-test-subj="dashboardPanelExpandIcon"
      onClick={onMinimize}
    >
      <span
        aria-hidden="true"
        className="kuiIcon fa-compress"
      />
    </button>
  );
}

PanelMinimizeIcon.propTypes = {
  onMinimize: PropTypes.func.isRequired
};
