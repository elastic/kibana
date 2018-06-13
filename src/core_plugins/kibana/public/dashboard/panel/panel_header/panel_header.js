import React from 'react';
import PropTypes from 'prop-types';

export function PanelHeader({ title, customDashboardLink, actions, isViewOnlyMode, hidePanelTitles }) {
  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className="panel-heading-floater">
        <div className="kuiMicroButtonGroup">
          {actions}
        </div>
      </div>
    );
  }

  if (customDashboardLink) {
    return (
      <div className="panel-heading">
        <span
          data-test-subj="dashboardPanelTitle"
          className="panel-title"
          title={title}
          aria-label={`Dashboard panel: ${title}`}
        >
          <a
            href={customDashboardLink}
          >
            <u>
              {title}
            </u>
          </a>
        </span>
        <div className="kuiMicroButtonGroup">
          {actions}
        </div>
      </div>
    );
  } else {
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
}

PanelHeader.propTypes = {
  isViewOnlyMode: PropTypes.bool,
  title: PropTypes.string,
  customDashboardLink: PropTypes.string,
  actions: PropTypes.node,
  hidePanelTitles: PropTypes.bool.isRequired,
};
