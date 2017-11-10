import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { PanelOptionsMenu } from './panel_options_menu';

import {
  deletePanel,
  destroyEmbeddable,
  maximizePanel,
  minimizePanel,
} from '../../actions';

import {
  getEmbeddable,
  getEmbeddableEditUrl,
  getMaximizedPanelId,
} from '../../selectors';

const mapStateToProps = ({ dashboard }, { panelId }) => {
  const embeddable = getEmbeddable(dashboard, panelId);
  return {
    editUrl: embeddable ? getEmbeddableEditUrl(dashboard, panelId) : '',
    isExpanded: getMaximizedPanelId(dashboard) === panelId,
  };
};

/**
 * @param dispatch {Function}
 * @param embeddableFactory {EmbeddableFactory}
 * @param panelId {string}
 */
const mapDispatchToProps = (dispatch, { embeddableFactory, panelId }) => ({
  onDeletePanel: () => {
    dispatch(deletePanel(panelId));
    dispatch(destroyEmbeddable(panelId, embeddableFactory));
  },
  onMaximizePanel: () => dispatch(maximizePanel(panelId)),
  onMinimizePanel: () => dispatch(minimizePanel()),
});

const mergeProps = (stateProps, dispatchProps) => {
  const { isExpanded, editUrl } = stateProps;
  const { onMaximizePanel, onMinimizePanel, onDeletePanel } = dispatchProps;
  const toggleExpandedPanel = () => isExpanded ? onMinimizePanel() : onMaximizePanel();

  return {
    toggleExpandedPanel,
    isExpanded,
    editUrl,
    onDeletePanel
  };
};

export const PanelOptionsMenuContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(PanelOptionsMenu);

PanelOptionsMenuContainer.propTypes = {
  panelId: PropTypes.string.isRequired,
  /**
   * @type {EmbeddableFactory}
   */
  embeddableFactory: PropTypes.shape({
    destroy: PropTypes.func.isRequired,
    render: PropTypes.func.isRequired,
    addDestroyEmeddable: PropTypes.func.isRequired,
  }).isRequired,
};
