import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

import {
  initializeEmbeddable,
  deletePanel,
} from '../actions';

import {
  getEmbeddable,
  getFullScreenMode,
  getViewMode,
  getEmbeddableError,
  getEmbeddableInitialized,
} from '../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    error: embeddable ? getEmbeddableError(dashboard, panelId) : '',
    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    initialized: embeddable ? getEmbeddableInitialized(dashboard, panelId) : false
  };
};

const mapDispatchToProps = (dispatch, { embeddableFactory, panelId }) => ({
  initializeEmbeddable: () => (
    dispatch(initializeEmbeddable({ embeddableFactory, panelId }))
  ),
  destroy: () => (
    dispatch(deletePanel(panelId))
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
