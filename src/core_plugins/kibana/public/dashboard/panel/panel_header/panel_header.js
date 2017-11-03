import React from 'react';
import PropTypes from 'prop-types';

export function PanelHeader({ title, actions }) {
  return (
    <div className="panel-heading">
      <span
        data-test-subj="dashboardPanelTitle"
        className="panel-title"
        tooltip={title}
        title={title}
        aria-label={`Dashboard panel: ${title}`}
      >
        {title}
      </span>

      <div className="kuiMicroButtonGroup">
        {actions}
      </div>
    </div>
  );
}

PanelHeader.propTypes = {
  title: PropTypes.string,
  actions: PropTypes.node,
};
