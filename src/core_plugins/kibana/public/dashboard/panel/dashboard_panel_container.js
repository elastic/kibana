import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { DashboardPanel } from './dashboard_panel';
import { DashboardViewMode } from '../dashboard_view_mode';

import {
  renderEmbeddable,
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
} from '../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    title: embeddable ? getEmbeddableTitle(dashboard, panelId) : '',
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : '',
    error: embeddable ? getEmbeddableError(dashboard, panelId) : '',

    viewOnlyMode: getFullScreenMode(dashboard) || getViewMode(dashboard) === DashboardViewMode.VIEW,
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
    panel: getPanel(dashboard, panelId),
  };
};

const mapDispatchToProps = (dispatch, { embeddableHandler, panelId, getContainerApi }) => ({
  renderEmbeddable: (panelElement, panel) => (
    dispatch(renderEmbeddable(embeddableHandler, panelElement, panel, getContainerApi()))
  ),
  onDestroy: () => dispatch(destroyEmbeddable(panelId, embeddableHandler)),
});

export const DashboardPanelContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardPanel);

DashboardPanelContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  /**
   * @type {EmbeddableHandler}
   */
  embeddableHandler: PropTypes.shape({
    destroy: PropTypes.func.isRequired,
    render: PropTypes.func.isRequired,
    addDestroyEmeddable: PropTypes.func.isRequired,
  }).isRequired,
  getContainerApi: PropTypes.func.isRequired,
};
