import { connect } from 'react-redux';

import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

import {
  renderEmbeddable,
  maximizePanel,
  minimizePanel,
  deletePanel,
  destroyEmbeddable
} from '../actions';

import {
  getEmbeddable,
  getFullScreenMode,
  getViewMode,
  getEmbeddableTitle,
  getEmbeddableEditUrl,
  getMaximizedPanelId,
  getEmbeddableError,
} from '../reducers';

const mapStateToProps = ({ dashboardState }, { panelId }) => {
  const embeddable = getEmbeddable(dashboardState, panelId);
  return {
    title: embeddable ? getEmbeddableTitle(dashboardState, panelId) : '',
    editUrl: embeddable ? getEmbeddableEditUrl(dashboardState, panelId) : '',
    error: embeddable ? getEmbeddableError(dashboardState, panelId) : '',

    viewOnlyMode: getFullScreenMode(dashboardState) || getViewMode(dashboardState) === DashboardViewMode.VIEW,
    isExpanded: getMaximizedPanelId(dashboardState) === panelId,
  };
};

const mapDispatchToProps = (dispatch, { embeddableHandler, panelId, getContainerApi }) => ({
  renderEmbeddable: (panelElement) => dispatch(renderEmbeddable(embeddableHandler, panelElement, panelId, getContainerApi())),
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
    dispatch(destroyEmbeddable(panelId, embeddableHandler));
  },
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
  onDestroy: () => dispatch(destroyEmbeddable(panelId, embeddableHandler)),
});

export const DashboardPanelContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);
