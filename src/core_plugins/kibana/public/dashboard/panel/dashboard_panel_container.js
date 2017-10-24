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
  getPanel,
  getEmbeddable,
  getFullScreenMode,
  getViewMode,
  getEmbeddableTitle,
  getEmbeddableEditUrl,
  getMaximizedPanelId,
  getEmbeddableError,
} from '../reducers';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    title: embeddable ? getEmbeddableTitle(dashboard, panelId) : '',
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : '',
    error: embeddable ? getEmbeddableError(dashboard, panelId) : '',

    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    panel: getPanel(dashboard, panelId)
  };
};

const mapDispatchToProps = (dispatch, { embeddableHandler, panelId, getContainerApi }) => ({
  renderEmbeddable: (panelElement, panel) => (
    dispatch(renderEmbeddable(embeddableHandler, panelElement, panel, getContainerApi()))
  ),
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
