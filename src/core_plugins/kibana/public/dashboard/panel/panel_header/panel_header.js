import React from 'react';
import PropTypes from 'prop-types';
import { embeddableShape } from 'ui/embeddable';
import { PanelOptionsMenuContainer } from './panel_options_menu_container';

export function PanelHeader({ title, panelId, embeddable, isViewOnlyMode, hidePanelTitles }) {
  if (isViewOnlyMode && (!title || hidePanelTitles)) {
    return (
      <div className="panel-heading-floater">
        <div className="kuiMicroButtonGroup">
          <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel-heading" data-test-subj={`dashboardPanelHeading-${title.replace(/\s/g, '')}`}>
      <span
        data-test-subj="dashboardPanelTitle"
        className="panel-title"
        title={title}
        aria-label={`Dashboard panel: ${title}`}
      >
        {hidePanelTitles ? '' : title}
      </span>

      <div className="kuiMicroButtonGroup">
        <PanelOptionsMenuContainer panelId={panelId} embeddable={embeddable} />
      </div>
    </div>
  );
}

PanelHeader.propTypes = {
  isViewOnlyMode: PropTypes.bool,
  title: PropTypes.string,
  hidePanelTitles: PropTypes.bool.isRequired,
  embeddable: embeddableShape,
  panelId: PropTypes.string.isRequired,
};
