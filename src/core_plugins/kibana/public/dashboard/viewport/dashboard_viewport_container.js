import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';

const mapStateToProps = ({ dashboardState }, { getEmbeddableHandler, getContainerApi }) => {
  if (dashboardState.maximizedPanelId !== undefined) {
    const panel = dashboardState.panels[dashboardState.maximizedPanelId];
    const maximizedPanelEmbeddableHandler = getEmbeddableHandler(panel.type);
    return {
      maximizedPanelId: dashboardState.maximizedPanelId,
      maximizedPanelEmbeddableHandler
    };
  } else {
    return {
      getEmbeddableHandler: getEmbeddableHandler,
      getContainerApi: getContainerApi
    };
  }
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

