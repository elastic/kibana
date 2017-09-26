import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux'
import { DashboardPanelContainer } from '../panel/dashboard_panel_container';
import { DashboardGridContainer } from '../grid/dashboard_grid_container';

function Dashboard({ getContainerApi, maximizedPanelId, maximizedPanelEmbeddableHandler, getEmbeddableHandler }) {
  function renderMaximizedPanel() {
    return (
      <DashboardPanelContainer
        panelId={maximizedPanelId}
        getContainerApi={getContainerApi}
        embeddableHandler={maximizedPanelEmbeddableHandler}
      />
    );
  }

  function renderDashboardGrid() {
    return (
      <DashboardGridContainer
        getEmbeddableHandler={getEmbeddableHandler}
        getContainerApi={getContainerApi}
      />
    );
  }

  return (
    <div>
      {maximizedPanelId === undefined ? renderDashboardGrid() : renderMaximizedPanel()}
    </div>
  );
}

Dashboard.propTypes = {
  getContainerApi: PropTypes.func,
  getEmbeddableHandler: PropTypes.func,
  maximizedPanelId: PropTypes.number,
  maximizedPanelEmbeddableHandler: PropTypes.object
};

const mapStateToProps = ({ dashboardState }, ownProps) => {
  if (dashboardState.maximizedPanelId !== undefined) {
    const panel = dashboardState.panels[dashboardState.maximizedPanelId];
    const maximizedPanelEmbeddableHandler = ownProps.getEmbeddableHandler(panel.type);
    return {
      maximizedPanelId: dashboardState.maximizedPanelId,
      maximizedPanelEmbeddableHandler
    }
  } else {
    return {
      getEmbeddableHandler: ownProps.getEmbeddableHandler,
      getContainerApi: ownProps.getContainerApi
    }
  }
};

const mapDispatchToProps = (dispatch, ownProps) => ({
});

export const DashboardContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Dashboard);

