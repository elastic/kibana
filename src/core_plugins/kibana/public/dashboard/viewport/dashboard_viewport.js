import React from 'react';
import PropTypes from 'prop-types';
import { DashboardGridContainer } from '../grid/dashboard_grid_container';

export function DashboardViewport({
  getContainerApi,
  maximizedPanelId,
  getEmbeddableHandler,
  panelCount,
}) {
  return (
    <div
      data-shared-items-count={panelCount}
    >
      <DashboardGridContainer
        getEmbeddableHandler={getEmbeddableHandler}
        getContainerApi={getContainerApi}
        maximizedPanelId={maximizedPanelId}
      />
    </div>
  );
}

DashboardViewport.propTypes = {
  getContainerApi: PropTypes.func,
  getEmbeddableHandler: PropTypes.func,
  maximizedPanelId: PropTypes.string,
  panelCount: PropTypes.number,
};
