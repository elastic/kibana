import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

import {
  deletePanel,
} from '../actions';

import {
  getEmbeddable,
  getFullScreenMode,
  getViewMode,
  getEmbeddableError,
  getPanelType,
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
  return {
    error,
    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
  };
};

const mapDispatchToProps = (dispatch, { panelId }) => ({
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
