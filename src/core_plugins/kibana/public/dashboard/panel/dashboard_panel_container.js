import { connect } from 'react-redux';
import { renderEmbeddable, maximizePanel, minimizePanel, deletePanel } from '../dashboard_actions';
import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

const mapStateToProps = ({ dashboardState }, { onPanelBlurred, onPanelFocused, panelId }) => {
  const embeddable = dashboardState.embeddables[panelId];
  const title = embeddable ? embeddable.title : '';
  const editUrl = embeddable ? embeddable.editUrl : '';
  return {
    viewOnlyMode: dashboardState.isFullScreenMode || dashboardState.viewMode === DashboardViewMode.VIEW,
    title,
    editUrl,
    isExpanded: dashboardState.maximizedPanelId === panelId,
    panelId,
    onPanelBlurred,
    onPanelFocused,
    error: dashboardState.panels[panelId].renderError
  };
};

const mapDispatchToProps = (dispatch, { embeddableHandler, panelId, getContainerApi }) => ({
  renderEmbeddable: (panelElement) => {
    dispatch(renderEmbeddable(embeddableHandler, panelElement, panelId, getContainerApi()));
  },
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
  },
  onMaximizePanel: () => {
    dispatch(maximizePanel(panelId));
  },
  onMinimizePanel: () => {
    dispatch(minimizePanel());
  },
  onDestroy: () => {
    if (embeddableHandler) {
      embeddableHandler.destroy(panelId);
    }
  }
});

export const DashboardPanelContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);
