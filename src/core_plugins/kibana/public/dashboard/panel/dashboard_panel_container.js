import { connect } from 'react-redux'
import { renderEmbeddable, maximizePanel, minimizePanel, deletePanel } from '../dashboard_actions';
import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

const mapStateToProps = ({ dashboardState }, ownProps) => {
  const embeddable = dashboardState.embeddables[ownProps.panelId];
  const title = embeddable ? embeddable.title : '';
  const editUrl = embeddable ? embeddable.editUrl : '';
  return {
    viewOnlyMode: dashboardState.isFullScreenMode || dashboardState.viewMode === DashboardViewMode.VIEW,
    title,
    editUrl,
    isExpanded: dashboardState.maximizedPanelId === ownProps.panelId,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => ({
  renderEmbeddable: (panelElement) => {
    dispatch(renderEmbeddable(ownProps.embeddableHandler, panelElement, ownProps.panelId, ownProps.getContainerApi()))
  },
  onDeletePanel: () => {
    dispatch(deletePanel(ownProps.panelId));
  },
  onMaximizePanel: () => {
    dispatch(maximizePanel(ownProps.panelId));
  },
  onMinimizePanel: () => {
    dispatch(minimizePanel());
  },
  onDestroy: () => {
    ownProps.embeddableHandler.destroy(ownProps.panelId);
  }
});

export const DashboardPanelContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);

