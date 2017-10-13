import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanels } from '../reducers';

const mapStateToProps = ({ dashboardState }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboardState);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboardState)).length,
  };
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

