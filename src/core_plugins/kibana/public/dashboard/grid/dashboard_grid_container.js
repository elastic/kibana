import { connect } from 'react-redux';
import { DashboardGrid } from './dashboard_grid';
import { updatePanel } from '../actions';

const mapStateToProps = ({ dashboardState }, ownProps) => {
  return {
    panels: dashboardState.panels,
    getContainerApi: ownProps.getContainerApi,
    getEmbeddableHandler: ownProps.getEmbeddableHandler,
    dashboardViewMode: dashboardState.view.viewMode,
    hidden: ownProps.hidden
  };
};

const mapDispatchToProps = (dispatch) => ({
  onPanelUpdated: updatedPanel => {
    dispatch(updatePanel(updatedPanel));
  }
});

export const DashboardGridContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardGrid);

