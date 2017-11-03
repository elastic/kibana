import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanels, getTitle, getDescription, getUseMargins } from '../selectors';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
    description: getDescription(dashboard),
    title: getTitle(dashboard),
    useMargins: getUseMargins(dashboard),
  };
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

