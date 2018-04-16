import React from 'react';
import PropTypes from 'prop-types';
import { DashboardGrid } from '../grid';
import { ExitFullScreenButton } from '../components/exit_full_screen_button';

export function DashboardViewport({
  maximizedPanelId,
  getEmbeddableFactory,
  panelCount,
  title,
  description,
  useMargins,
  isFullScreenMode,
  onExitFullScreenMode,
}) {
  return (
    <div
      data-shared-items-count={panelCount}
      data-shared-items-container
      data-title={title}
      data-description={description}
      className={useMargins ? 'dashboard-viewport-with-margins' : 'dashboard-viewport'}
    >
      { isFullScreenMode && <ExitFullScreenButton onExitFullScreenMode={onExitFullScreenMode} /> }
      <DashboardGrid
        getEmbeddableFactory={getEmbeddableFactory}
        maximizedPanelId={maximizedPanelId}
      />
    </div>
  );
}

DashboardViewport.propTypes = {
  getEmbeddableFactory: PropTypes.func,
  maximizedPanelId: PropTypes.string,
  panelCount: PropTypes.number,
  title: PropTypes.string,
  description: PropTypes.string,
  useMargins: PropTypes.bool.isRequired,
};
