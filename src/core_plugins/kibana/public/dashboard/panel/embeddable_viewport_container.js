import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { EmbeddableViewport } from './embeddable_viewport';

import {
  getContainerState,
  getEmbeddable,
  getEmbeddableInitialized,
  getPanel
} from '../selectors';

import {
  embeddableIsInitialized,
  embeddableIsInitializing,
  embeddableError,
  embeddableStateChanged
} from '../actions';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  const initialized = embeddable ? getEmbeddableInitialized(dashboard, panelId) : false;
  return {
    containerState: getContainerState(dashboard, panelId),
    initialized,
    panel: getPanel(dashboard, panelId)
  };
};

const mapDispatchToProps = (dispatch, { panelId }) => ({
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

export const EmbeddableViewportContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(EmbeddableViewport);

EmbeddableViewportContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
};
