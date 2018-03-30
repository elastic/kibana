import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiIconTip,
} from '@elastic/eui';

export function PanelHeader({ title, actions, isViewOnlyMode, hidePanelTitles, hasSearch, searchLabel }) {
  console.log(hasSearch);
  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className="panel-heading-floater">
        <div className="kuiMicroButtonGroup">
          {actions}
        </div>
      </div>
    );
  }

  const renderTitle = () => {
    if (hidePanelTitles) {
      return '';
    }

    if (hasSearch) {
      return (
        <Fragment>
          {`${title} `}
          <EuiIconTip
            content={searchLabel}
            type="kqlSelector"
          />
        </Fragment>
      );
    }

    return title;
  }

  return (
    <div className="panel-heading">
      <span
        data-test-subj="dashboardPanelTitle"
        className="panel-title"
        title={title}
        aria-label={`Dashboard panel: ${title}`}
      >
        {renderTitle()}
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
  hasSearch: PropTypes.bool,
  searchLabel: PropTypes.string,
  actions: PropTypes.node,
  hidePanelTitles: PropTypes.bool.isRequired,
};
