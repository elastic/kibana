import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { getMaximizedPanelId, getPanels, getTitle, getDescription } from '../selectors';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
    description: getDescription(dashboard),
    title: getTitle(dashboard),
  };
};

export const DashboardViewportContainer = connect(
  mapStateToProps
)(DashboardViewport);

