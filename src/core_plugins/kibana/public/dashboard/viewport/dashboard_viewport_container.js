import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanels, getUseMargins } from '../selectors';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
    useMargins: getUseMargins(dashboard),
  };
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

