import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanelType, getPanels } from '../reducers';

const mapStateToProps = ({ dashboardState }, { getEmbeddableHandler }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboardState);
  if (maximizedPanelId !== undefined) {
    const panelType = getPanelType(dashboardState, maximizedPanelId);
    const maximizedPanelEmbeddableHandler = getEmbeddableHandler(panelType);
    return {
      maximizedPanelId: maximizedPanelId,
      maximizedPanelEmbeddableHandler
    };
  } else {
    return {
      panelCount: Object.keys(getPanels(dashboardState)).length
    };
  }
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

