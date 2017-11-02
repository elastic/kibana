import React from 'react';
import PropTypes from 'prop-types';
import { DashboardGrid } from '../grid';

export function DashboardViewport({
  getContainerApi,
  maximizedPanelId,
  getEmbeddableHandler,
  panelCount,
  useMargins,
}) {
  return (
    <div
      data-shared-items-count={panelCount}
      className={useMargins ? 'dashboard-viewport-with-margins' : 'dashboard-viewport'}
    >
      <DashboardGrid
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
  useMargins: PropTypes.bool.isRequired,
};
