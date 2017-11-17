import React from 'react';
import PropTypes from 'prop-types';

export function PanelHeader({ title, actions, isViewOnlyMode }) {
  if (isViewOnlyMode && !title) {
    return (
      <div className="panel-heading-floater">
        <div className="kuiMicroButtonGroup">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-heading">
      <span
        data-test-subj="dashboardPanelTitle"
        className="panel-title"
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
  isViewOnlyMode: PropTypes.bool,
  title: PropTypes.string,
  actions: PropTypes.node,
};
