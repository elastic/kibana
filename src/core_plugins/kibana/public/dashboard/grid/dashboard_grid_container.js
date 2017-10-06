import { connect } from 'react-redux';
import { DashboardGrid } from './dashboard_grid';
import { updatePanel } from '../actions';
import { getPanels, getViewMode } from '../reducers';

const mapStateToProps = ({ dashboardState }) => ({
  panels: getPanels(dashboardState),
  dashboardViewMode: getViewMode(dashboardState),
});

const mapDispatchToProps = (dispatch) => ({
  onPanelUpdated: updatedPanel => dispatch(updatePanel(updatedPanel)),
});

export const DashboardGridContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardGrid);

