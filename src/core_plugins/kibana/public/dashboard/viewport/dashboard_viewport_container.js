import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';

const mapStateToProps = ({ dashboardState }, { getEmbeddableHandler, getContainerApi }) => {
  const { maximizedPanelId } = dashboardState.view;
  if (maximizedPanelId !== undefined) {
    const panel = dashboardState.panels[maximizedPanelId];
    const maximizedPanelEmbeddableHandler = getEmbeddableHandler(panel.type);
    return {
      maximizedPanelId: maximizedPanelId,
      maximizedPanelEmbeddableHandler
    };
  } else {
    return {
      getEmbeddableHandler: getEmbeddableHandler,
      getContainerApi: getContainerApi,
      panelCount: Object.keys(dashboardState.panels).length
    };
  }
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

