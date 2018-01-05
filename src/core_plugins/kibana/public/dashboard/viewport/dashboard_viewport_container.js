import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { updateIsFullScreenMode } from '../actions';
import {
  getMaximizedPanelId,
  getPanels,
  getTitle,
  getDescription,
  getUseMargins,
  getFullScreenMode,
} from '../selectors';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
    description: getDescription(dashboard),
    title: getTitle(dashboard),
    useMargins: getUseMargins(dashboard),
    isFullScreenMode: getFullScreenMode(dashboard),
  };
};

const mapDispatchToProps = (dispatch) => ({
  onExitFullScreenMode: () => dispatch(updateIsFullScreenMode(false)),
});

export const DashboardViewportContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DashboardViewport);
