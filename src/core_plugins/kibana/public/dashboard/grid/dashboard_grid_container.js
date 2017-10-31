import { connect } from 'react-redux';
import { DashboardGrid } from './dashboard_grid';
import { updatePanel } from '../actions';
import { getPanels, getViewMode } from '../selectors';

const mapStateToProps = ({ dashboard }) => ({
  panels: getPanels(dashboard),
  dashboardViewMode: getViewMode(dashboard),
});

const mapDispatchToProps = (dispatch) => ({
  onPanelUpdated: updatedPanel => dispatch(updatePanel(updatedPanel)),
});

export const DashboardGridContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardGrid);

