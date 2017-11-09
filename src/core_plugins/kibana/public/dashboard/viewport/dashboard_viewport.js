import React from 'react';
import PropTypes from 'prop-types';
import { DashboardGrid } from '../grid';
import { FullScreenModePlaceholder } from '../components/full_screen_placeholder';

export function DashboardViewport({
  getContainerApi,
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
      { isFullScreenMode && <FullScreenModePlaceholder onExitFullScreenMode={onExitFullScreenMode} /> }
      <DashboardGrid
        getEmbeddableFactory={getEmbeddableFactory}
        getContainerApi={getContainerApi}
        maximizedPanelId={maximizedPanelId}
      />
    </div>
  );
}

DashboardViewport.propTypes = {
  getContainerApi: PropTypes.func,
  getEmbeddableFactory: PropTypes.func,
  maximizedPanelId: PropTypes.string,
  panelCount: PropTypes.number,
  title: PropTypes.string,
  description: PropTypes.string,
  useMargins: PropTypes.bool.isRequired,
};
