import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanels } from '../reducers';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
  };
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

