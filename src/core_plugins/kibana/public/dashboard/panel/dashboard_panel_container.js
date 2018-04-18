import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

import {
  deletePanel, embeddableError, embeddableIsInitialized, embeddableIsInitializing, embeddableStateChanged,
} from '../actions';

import {
  getEmbeddable,
  getFullScreenMode,
  getViewMode,
  getEmbeddableError,
  getPanelType, getContainerState, getPanel, getEmbeddableInitialized,
} from '../selectors';

const mapStateToProps = ({ dashboard }, { embeddableFactory, panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  let error = null;
  if (!embeddableFactory) {
    const panelType = getPanelType(dashboard, panelId);
    error = `No embeddable factory found for panel type ${panelType}`;
  } else {
    error = (embeddable && getEmbeddableError(dashboard, panelId)) || '';
  }
  const initialized = embeddable ? getEmbeddableInitialized(dashboard, panelId) : false;
  return {
    error,
    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    containerState: getContainerState(dashboard, panelId),
    initialized,
    panel: getPanel(dashboard, panelId)
  };
};

const mapDispatchToProps = (dispatch, { panelId }) => ({
  destroy: () => (
    dispatch(deletePanel(panelId))
  ),
  embeddableIsInitializing: () => (
    dispatch(embeddableIsInitializing(panelId))
  ),
  embeddableIsInitialized: (metadata) => (
    dispatch(embeddableIsInitialized({ panelId, metadata }))
  ),
  embeddableStateChanged: (embeddableState) => (
    dispatch(embeddableStateChanged({ panelId, embeddableState }))
  ),
  embeddableError: (errorMessage) => (
    dispatch(embeddableError({ panelId, error: errorMessage }))
  )
});

export const DashboardPanelContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);

DashboardPanelContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  /**
   * @type {EmbeddableFactory}
   */
  embeddableFactory: PropTypes.shape({
    create: PropTypes.func.isRequired,
  }).isRequired,
};
