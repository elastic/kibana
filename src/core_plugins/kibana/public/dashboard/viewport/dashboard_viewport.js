import React from 'react';
import PropTypes from 'prop-types';
import { DashboardPanelContainer } from '../panel/dashboard_panel_container';
import { DashboardGridContainer } from '../grid/dashboard_grid_container';

export function DashboardViewport({
  getContainerApi,
  maximizedPanelId,
  maximizedPanelEmbeddableHandler,
  getEmbeddableHandler
}) {
  function renderMaximizedPanel() {
    return (
      <DashboardPanelContainer
        panelId={maximizedPanelId}
        getContainerApi={getContainerApi}
        embeddableHandler={maximizedPanelEmbeddableHandler}
      />
    );
  }

  // We always render the grid because we don't want to reload all the visualizations, which is a time consuming
  // operation, every time a panel is expanded or minimized.
  return (
    <div>
      <DashboardGridContainer
        hidden={maximizedPanelId !== undefined}
        getEmbeddableHandler={getEmbeddableHandler}
        getContainerApi={getContainerApi}
      />
      {maximizedPanelId !== undefined && renderMaximizedPanel()}
    </div>
  );
}

DashboardViewport.propTypes = {
  getContainerApi: PropTypes.func,
  getEmbeddableHandler: PropTypes.func,
  maximizedPanelId: PropTypes.string,
  maximizedPanelEmbeddableHandler: PropTypes.object
};
